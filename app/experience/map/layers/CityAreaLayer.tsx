'use client';

import { useMemo, useEffect, useState } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection, Geometry } from 'geojson';
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

// Module-level cache — fetch once per session, shared across all CityAreaLayer mounts
let cachedBoroughGeometry: Record<string, Geometry> | null = null;
let boroughFetch: Promise<Record<string, Geometry>> | null = null;

function loadBoroughGeometry(): Promise<Record<string, Geometry>> {
  if (cachedBoroughGeometry) return Promise.resolve(cachedBoroughGeometry);
  if (boroughFetch) return boroughFetch;
  boroughFetch = fetch('/data/toronto-boroughs.geojson')
    .then(r => r.json())
    .then((fc: FeatureCollection) => {
      const map: Record<string, Geometry> = {};
      fc.features.forEach(f => {
        const id = f.properties?.id as string | undefined;
        if (id && f.geometry) map[id] = f.geometry;
      });
      cachedBoroughGeometry = map;
      return map;
    });
  return boroughFetch;
}

export function CityAreaLayer({ metric, homeType, buyBedMult, rentBedMult, hoveredId, selectedFSA }: Props) {
  const selectedBoroughId = selectedFSA ? fsaToBoroughId(selectedFSA) : null;

  // Load accurate FSA boundaries — module-level cache means single fetch per session
  const [baseGeometry, setBaseGeometry] = useState<Record<string, Geometry>>(
    cachedBoroughGeometry ?? {}
  );
  useEffect(() => {
    if (cachedBoroughGeometry) return;
    loadBoroughGeometry()
      .then(map => setBaseGeometry(map))
      .catch(err => console.error('[CityAreaLayer] failed to load toronto-boroughs.geojson:', err));
  }, []);

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
    if (!baseGeometry) return { type: 'FeatureCollection', features: [] };

    const values = areas.map(a => metric === 'price' ? a.price : a.rent);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    return {
      type: 'FeatureCollection',
      features: areas
        .filter(a => baseGeometry[a.id])
        .map(a => ({
          type: 'Feature' as const,
          id: a.id,
          properties: {
            id: a.id,
            label: a.label,
            price: a.price,
            rent: a.rent,
            norm: ((metric === 'price' ? a.price : a.rent) - minVal) / range,
          },
          geometry: baseGeometry[a.id] as Geometry,
        })),
    };
  }, [areas, metric, baseGeometry]);

  const accent   = metric === 'price' ? '#92400E' : '#0E7490';
  const accentHi = metric === 'price' ? 'rgba(146,64,14,0.52)'  : 'rgba(14,116,144,0.52)';
  const accentLo = metric === 'price' ? 'rgba(146,64,14,0.07)'  : 'rgba(14,116,144,0.07)';
  const accentMd = metric === 'price' ? 'rgba(146,64,14,0.30)'  : 'rgba(14,116,144,0.30)';

  const fillColor = [
    'interpolate', ['linear'], ['get', 'norm'],
    0, accentLo,
    1, accentHi,
  ] as unknown as string;

  const fillPaint = {
    'fill-color': [
      'case',
      ['==', ['get', 'id'], hoveredId ?? ''],         accentMd,
      ['==', ['get', 'id'], selectedBoroughId ?? ''], accentMd,
      fillColor,
    ] as unknown as string,
    'fill-opacity': 1,
  };

  const linePaint = {
    'line-color': [
      'case',
      ['==', ['get', 'id'], hoveredId ?? ''],         'rgba(0,0,0,0.55)',
      ['==', ['get', 'id'], selectedBoroughId ?? ''], `${accent}CC`,
      `${accent}60`,
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
