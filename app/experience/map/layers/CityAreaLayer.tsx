'use client';

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
import { suggestPriceAndRent } from '@/engine';
import type { HomeType } from '@/engine';

export interface CityAreaData {
  id: string;
  label: string;
  fsa: string;
  price: number;
  rent: number;
}

interface Props {
  metric: 'price' | 'rent';
  homeType: HomeType;
  buyBedMult: number;
  rentBedMult: number;
  hoveredId: string | null;
  /** If provided, highlight this FSA's area as the selected one. */
  selectedFSA?: string;
  onHover?: (id: string | null, data: CityAreaData | null) => void;
}

// Toronto boroughs: [id, representative FSA, display label]
const TORONTO_BOROUGHS: [string, string, string][] = [
  ['etobicoke',  'M8V', 'Etobicoke'],
  ['west-end',   'M6H', 'West End'],
  ['downtown',   'M5V', 'Downtown Toronto'],
  ['east-end',   'M4E', 'East End'],
  ['north-york', 'M2R', 'North York'],
  ['scarborough','M1B', 'Scarborough'],
];

// Simplified rectangular boundaries. Covers the Toronto amalgamated municipality.
// Coordinates: [lng, lat]. Exterior ring, SW → SE → NE → NW → close.
const TORONTO_POLYGONS: Record<string, [number, number][]> = {
  'etobicoke':  [[-79.648,43.598],[-79.490,43.598],[-79.490,43.782],[-79.648,43.782],[-79.648,43.598]],
  'west-end':   [[-79.490,43.598],[-79.428,43.598],[-79.428,43.710],[-79.490,43.710],[-79.490,43.598]],
  'downtown':   [[-79.428,43.598],[-79.298,43.598],[-79.298,43.710],[-79.428,43.710],[-79.428,43.598]],
  'east-end':   [[-79.298,43.598],[-79.268,43.598],[-79.268,43.710],[-79.298,43.710],[-79.298,43.598]],
  'north-york': [[-79.490,43.710],[-79.268,43.710],[-79.268,43.782],[-79.490,43.782],[-79.490,43.710]],
  'scarborough':[[-79.268,43.598],[-79.160,43.598],[-79.160,43.782],[-79.268,43.782],[-79.268,43.598]],
};

// FSA → borough id (first 2 chars of FSA → which polygon it belongs to)
const FSA_TO_BOROUGH: Record<string, string> = {
  M1: 'scarborough', M2: 'north-york', M3: 'north-york',
  M4: 'east-end',    M5: 'downtown',   M6: 'west-end',
  M7: 'downtown',    M8: 'etobicoke',  M9: 'etobicoke',
};

export function fsaToBoroughId(fsa: string): string | null {
  const prefix = fsa.substring(0, 2).toUpperCase();
  return FSA_TO_BOROUGH[prefix] ?? null;
}

export function CityAreaLayer({ metric, homeType, buyBedMult, rentBedMult, hoveredId, selectedFSA }: Props) {
  const selectedBoroughId = selectedFSA ? fsaToBoroughId(selectedFSA) : null;

  const areas = useMemo<CityAreaData[]>(() => {
    return TORONTO_BOROUGHS.map(([id, fsa, label]) => {
      const sug = suggestPriceAndRent(fsa, homeType);
      if (!sug || sug.medianPrice === 0) return null;
      return {
        id,
        label,
        fsa,
        price: Math.round(sug.medianPrice * buyBedMult),
        rent: Math.round(sug.suggestedMonthlyRent * rentBedMult),
      };
    }).filter((a): a is CityAreaData => a !== null);
  }, [homeType, buyBedMult, rentBedMult]);

  const geojson = useMemo((): FeatureCollection => {
    const values = areas.map(a => metric === 'price' ? a.price : a.rent);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    return {
      type: 'FeatureCollection',
      features: areas.map(a => ({
        type: 'Feature' as const,
        id: a.id,
        properties: {
          id: a.id,
          label: a.label,
          price: a.price,
          rent: a.rent,
          norm: (((metric === 'price' ? a.price : a.rent) - minVal) / range),
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [TORONTO_POLYGONS[a.id] ?? []],
        },
      })),
    };
  }, [areas, metric]);

  const accent   = metric === 'price' ? '#F59E0B' : '#10B981';
  const accentHi = metric === 'price' ? 'rgba(245,158,11,0.52)' : 'rgba(16,185,129,0.52)';
  const accentLo = metric === 'price' ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)';
  const accentMd = metric === 'price' ? 'rgba(245,158,11,0.30)' : 'rgba(16,185,129,0.30)';

  const fillColor = [
    'interpolate', ['linear'], ['get', 'norm'],
    0, accentLo,
    1, accentHi,
  ] as unknown as string;

  const fillPaint = {
    'fill-color': [
      'case',
      ['==', ['get', 'id'], hoveredId ?? ''],      accentMd,
      ['==', ['get', 'id'], selectedBoroughId ?? ''], accentMd,
      fillColor,
    ] as unknown as string,
    'fill-opacity': 1,
  };

  const linePaint = {
    'line-color': [
      'case',
      ['==', ['get', 'id'], hoveredId ?? ''],         'rgba(255,255,255,0.85)',
      ['==', ['get', 'id'], selectedBoroughId ?? ''], `${accent}CC`,
      `${accent}50`,
    ] as unknown as string,
    'line-width': [
      'case',
      ['==', ['get', 'id'], hoveredId ?? ''],         2.2,
      ['==', ['get', 'id'], selectedBoroughId ?? ''], 1.8,
      0.8,
    ] as unknown as number,
  };

  return (
    <Source id="city-areas" type="geojson" data={geojson}>
      <Layer id="city-area-fill" type="fill" source="city-areas" paint={fillPaint} />
      <Layer id="city-area-line" type="line" source="city-areas" paint={linePaint} />
    </Source>
  );
}
