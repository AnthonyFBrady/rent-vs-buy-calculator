'use client';

import { useMemo, useEffect, useState } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection, Geometry } from 'geojson';
import { suggestPriceAndRent } from '@/engine';
import type { HomeType } from '@/engine';
import { TORONTO_FSA_CENTROIDS } from '@/engine/data/regions/coordinates';

export interface FSAData {
  fsa: string;
  name: string;
  price: number;
  rent: number;
}

interface Props {
  metric: 'price' | 'rent';
  homeType: HomeType;
  buyBedMult: number;
  rentBedMult: number;
  hoveredFSA: string | null;
}

// Module-level cache — single fetch per session
let cachedFSAGeometry: Record<string, Geometry> | null = null;
let fsaFetch: Promise<Record<string, Geometry>> | null = null;

function loadFSAGeometry(): Promise<Record<string, Geometry>> {
  if (cachedFSAGeometry) return Promise.resolve(cachedFSAGeometry);
  if (fsaFetch) return fsaFetch;
  fsaFetch = fetch('/data/toronto-fsas.geojson')
    .then(r => r.json())
    .then((fc: FeatureCollection) => {
      const map: Record<string, Geometry> = {};
      fc.features.forEach(f => {
        const fsa = f.properties?.fsa as string | undefined;
        if (fsa && f.geometry) map[fsa] = f.geometry;
      });
      cachedFSAGeometry = map;
      return map;
    });
  return fsaFetch;
}

export function TorontoFSALayer({ metric, homeType, buyBedMult, rentBedMult, hoveredFSA }: Props) {
  const [fsaGeometry, setFsaGeometry] = useState<Record<string, Geometry>>(
    cachedFSAGeometry ?? {}
  );

  useEffect(() => {
    if (cachedFSAGeometry) return;
    loadFSAGeometry()
      .then(map => setFsaGeometry(map))
      .catch(err => console.error('[TorontoFSALayer] failed to load toronto-fsas.geojson:', err));
  }, []);

  const fsaData = useMemo<FSAData[]>(() => {
    return TORONTO_FSA_CENTROIDS.map(f => {
      const sug = suggestPriceAndRent(f.fsa, homeType);
      if (!sug || sug.medianPrice === 0) return null;
      return {
        fsa: f.fsa,
        name: f.name,
        price: Math.round(sug.medianPrice * buyBedMult),
        rent: Math.round(sug.suggestedMonthlyRent * rentBedMult),
      };
    }).filter((d): d is FSAData => d !== null);
  }, [homeType, buyBedMult, rentBedMult]);

  const geojson = useMemo((): FeatureCollection => {
    const values = fsaData.map(d => metric === 'price' ? d.price : d.rent);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    return {
      type: 'FeatureCollection',
      features: fsaData
        .filter(d => !!fsaGeometry[d.fsa])
        .map(d => {
          const val = metric === 'price' ? d.price : d.rent;
          return {
            type: 'Feature' as const,
            properties: {
              fsa: d.fsa,
              name: d.name,
              price: d.price,
              rent: d.rent,
              norm: (val - minVal) / range,
            },
            geometry: fsaGeometry[d.fsa] as Geometry,
          };
        }),
    };
  }, [fsaData, metric, fsaGeometry]);

  const accent   = metric === 'price' ? '#92400E' : '#0E7490';
  const accentHi = metric === 'price' ? 'rgba(146,64,14,0.52)'  : 'rgba(14,116,144,0.52)';
  const accentLo = metric === 'price' ? 'rgba(146,64,14,0.07)'  : 'rgba(14,116,144,0.07)';
  const accentMd = metric === 'price' ? 'rgba(146,64,14,0.35)'  : 'rgba(14,116,144,0.35)';

  const fillColor = [
    'interpolate', ['linear'], ['get', 'norm'],
    0, accentLo,
    1, accentHi,
  ] as unknown as string;

  const fillPaint = {
    'fill-color': [
      'case',
      ['==', ['get', 'fsa'], hoveredFSA ?? ''], accentMd,
      fillColor,
    ] as unknown as string,
    'fill-opacity': 1,
  };

  const linePaint = {
    'line-color': [
      'case',
      ['==', ['get', 'fsa'], hoveredFSA ?? ''], 'rgba(0,0,0,0.55)',
      `${accent}60`,
    ] as unknown as string,
    'line-width': [
      'case',
      ['==', ['get', 'fsa'], hoveredFSA ?? ''], 2,
      0.6,
    ] as unknown as number,
  };

  return (
    <Source id="toronto-fsa" type="geojson" data={geojson}>
      <Layer id="toronto-fsa-fill" type="fill" source="toronto-fsa" minzoom={11.5} paint={fillPaint} />
      <Layer id="toronto-fsa-line" type="line" source="toronto-fsa" minzoom={11.5} paint={linePaint} />
    </Source>
  );
}
