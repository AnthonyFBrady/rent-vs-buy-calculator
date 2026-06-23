'use client';

import { Marker } from 'react-map-gl/maplibre';
import type { Province } from '@/engine';
import type { ProvinceMarker } from '../useMapState';

interface Props {
  markers: ProvinceMarker[];
  interactive: boolean;
  onProvinceClick?: (province: Province) => void;
}

export function NationalView({ markers, interactive, onProvinceClick }: Props) {
  return (
    <>
      {markers.map(m => (
        <Marker
          key={m.id}
          longitude={m.lng}
          latitude={m.lat}
          anchor="center"
          onClick={interactive && onProvinceClick ? () => onProvinceClick(m.id) : undefined}
        >
          <div
            title={m.label}
            style={{
              width: m.isSelected ? 18 : 10,
              height: m.isSelected ? 18 : 10,
              borderRadius: '50%',
              backgroundColor: m.isSelected ? 'var(--color-owner)' : 'rgba(250,250,250,0.45)',
              border: m.isSelected ? '2px solid var(--color-surface-raised)' : '1.5px solid rgba(250,250,250,0.3)',
              cursor: interactive ? 'pointer' : 'default',
              boxShadow: m.isSelected ? '0 0 12px rgba(var(--brand-owner-rgb),0.6)' : 'none',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          />
        </Marker>
      ))}
    </>
  );
}
