'use client';

import { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import type { MetroMarker } from '../useMapState';

interface Props {
  markers: MetroMarker[];
  onCityClick?: (marker: MetroMarker) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

function markerRadius(price: number, maxPrice: number): number {
  if (maxPrice === 0) return 8;
  return 6 + (price / maxPrice) * 22;
}

export function PriceMarkerLayer({ markers, onCityClick }: Props) {
  const [hovered, setHovered] = useState<MetroMarker | null>(null);

  const validMarkers = markers.filter(m => m.medianPrice > 0);
  const maxPrice = Math.max(...validMarkers.map(m => m.medianPrice), 1);

  return (
    <>
      {validMarkers.map(m => {
        const r = markerRadius(m.medianPrice, maxPrice);
        const isActive = m.isSelected || hovered?.id === m.id;
        return (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
            <div
              onMouseEnter={() => setHovered(m)}
              onMouseLeave={() => setHovered(null)}
              onClick={onCityClick ? () => onCityClick(m) : undefined}
              style={{
                width: m.isSelected ? (r * 2 + 8) : r * 2,
                height: m.isSelected ? (r * 2 + 8) : r * 2,
                borderRadius: '50%',
                backgroundColor: 'rgba(245,158,11,0.22)',
                border: `${m.isSelected ? 3 : 2}px solid #F59E0B`,
                cursor: onCityClick ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                boxShadow: isActive ? '0 0 20px rgba(245,158,11,0.6)' : 'none',
              }}
            >
              <div
                style={{
                  width: Math.max(r * 0.5, 4),
                  height: Math.max(r * 0.5, 4),
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                  opacity: m.isSelected ? 1 : 0.85,
                }}
              />
            </div>
          </Marker>
        );
      })}

      {hovered && (
        <Popup
          longitude={hovered.lng}
          latitude={hovered.lat}
          anchor="bottom"
          offset={24}
          closeButton={false}
          closeOnClick={false}
          style={{ zIndex: 10 }}
        >
          <div style={{
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'system-ui, sans-serif',
            minWidth: '180px',
          }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#FAFAFA', marginBottom: '6px' }}>
              {hovered.metro}
            </div>
            <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.7 }}>
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>{fmtCAD.format(hovered.medianPrice)}</span>
              {' '}median price
            </div>
            <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.7 }}>
              <span style={{ color: '#FAFAFA' }}>{fmtCAD.format(hovered.monthlyRent)}/mo</span>
              {' '}est. rent
            </div>
            {hovered.propertyTaxPct != null && (
              <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.7 }}>
                Property tax: <span style={{ color: '#FAFAFA' }}>{(hovered.propertyTaxPct * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
