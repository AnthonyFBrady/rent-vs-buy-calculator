'use client';

import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';

function circlePolygon(lng: number, lat: number, radiusKm: number) {
  const N = 64;
  const latRad = (lat * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * 2 * Math.PI;
    coords.push([
      lng + (radiusKm / (111.32 * Math.cos(latRad))) * Math.cos(a),
      lat + (radiusKm / 111.32) * Math.sin(a),
    ]);
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

interface Props {
  lat: number;
  lng: number;
  radiusKm: number;
}

export function SelectedAreaLayer({ lat, lng, radiusKm }: Props) {
  const data = useMemo(() => circlePolygon(lng, lat, radiusKm), [lng, lat, radiusKm]);

  return (
    <Source id="selected-area" type="geojson" data={data}>
      <Layer
        id="selected-area-fill"
        type="fill"
        paint={{ 'fill-color': '#92400E', 'fill-opacity': 0.07 }}
      />
      <Layer
        id="selected-area-line"
        type="line"
        paint={{
          'line-color': '#92400E',
          'line-width': 2,
          'line-opacity': 0.55,
          'line-dasharray': [5, 4],
        }}
      />
    </Source>
  );
}
