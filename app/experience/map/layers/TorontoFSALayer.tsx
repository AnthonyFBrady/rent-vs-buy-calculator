'use client';

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection } from 'geojson';
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

export function TorontoFSALayer({ metric, homeType, buyBedMult, rentBedMult, hoveredFSA }: Props) {
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
      features: fsaData.map(d => {
        const centroid = TORONTO_FSA_CENTROIDS.find(f => f.fsa === d.fsa);
        if (!centroid) return null;
        const val = metric === 'price' ? d.price : d.rent;
        return {
          type: 'Feature' as const,
          properties: {
            fsa: d.fsa,
            name: d.name,
            price: d.price,
            rent: d.rent,
            norm: (val - minVal) / range,
            isHovered: d.fsa === hoveredFSA,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [centroid.lng, centroid.lat],
          },
        };
      }).filter((f): f is NonNullable<typeof f> => f !== null),
    };
  }, [fsaData, metric, hoveredFSA]);

  // Price accent: amber. Rent accent: teal.
  const accentLo = metric === 'price' ? 'rgba(146,64,14,0.20)' : 'rgba(14,116,144,0.20)';
  const accentHi = metric === 'price' ? 'rgba(245,158,11,0.85)' : 'rgba(20,184,166,0.85)';
  const strokeColor = metric === 'price' ? 'rgba(245,158,11,1)' : 'rgba(20,184,166,1)';

  const circleColor = [
    'interpolate', ['linear'], ['get', 'norm'],
    0, accentLo,
    1, accentHi,
  ] as unknown as string;

  const circleRadius = [
    'interpolate', ['linear'], ['get', 'norm'],
    0, 5,
    1, 11,
  ] as unknown as number;

  return (
    <Source id="toronto-fsa" type="geojson" data={geojson}>
      <Layer
        id="toronto-fsa-circles"
        type="circle"
        source="toronto-fsa"
        minzoom={11.5}
        paint={{
          'circle-color': [
            'case',
            ['==', ['get', 'isHovered'], true], strokeColor,
            circleColor,
          ] as unknown as string,
          'circle-radius': [
            'case',
            ['==', ['get', 'isHovered'], true],
            ['*', circleRadius, 1.3] as unknown as number,
            circleRadius,
          ] as unknown as number,
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'isHovered'], true], 2,
            0.8,
          ] as unknown as number,
          'circle-stroke-color': strokeColor,
          'circle-opacity': 0.9,
        }}
      />
    </Source>
  );
}
