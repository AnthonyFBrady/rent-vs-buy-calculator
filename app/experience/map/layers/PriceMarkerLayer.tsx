'use client';

import { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import type { MetroMarker } from '../useMapState';

interface Props {
  markers: MetroMarker[];
  onCityClick?: (marker: MetroMarker) => void;
  /** FSA of the city the user has tapped but not yet confirmed. */
  pendingFSA?: string | null;
}

const fmtCAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

function markerRadius(price: number, maxPrice: number): number {
  if (maxPrice === 0) return 8;
  return 6 + (price / maxPrice) * 22;
}

export function PriceMarkerLayer({ markers, onCityClick, pendingFSA }: Props) {
  const [hovered, setHovered] = useState<MetroMarker | null>(null);

  const validMarkers = markers.filter(m => m.medianPrice > 0);
  const maxPrice = Math.max(...validMarkers.map(m => m.medianPrice), 1);
  const hasPending = !!pendingFSA;

  return (
    <>
      {validMarkers.map(m => {
        const r = markerRadius(m.medianPrice, maxPrice);
        const isPending = pendingFSA === m.id;
        const isActive = m.isSelected || hovered?.id === m.id || isPending;
        const dimmed = hasPending && !isPending;
        return (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
            <div
              onMouseEnter={() => setHovered(m)}
              onMouseLeave={() => setHovered(null)}
              onClick={onCityClick ? () => onCityClick(m) : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: onCityClick ? 'pointer' : 'default',
                pointerEvents: 'all',
                transition: 'opacity 0.25s ease',
                opacity: dimmed ? 0.35 : 1,
              }}
            >
              {/* City name label */}
              <div style={{
                background: (m.isSelected || isPending) ? 'var(--color-owner)' : 'rgba(255,255,255,0.88)',
                color: (m.isSelected || isPending) ? '#fff' : 'var(--color-owner)',
                border: `1px solid ${(m.isSelected || isPending) ? 'transparent' : 'rgba(var(--brand-owner-rgb),0.40)'}`,
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '9px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                lineHeight: 1.4,
                boxShadow: (m.isSelected || isPending) ? '0 1px 6px rgba(var(--brand-owner-rgb),0.45)' : 'none',
              }}>
                {m.metro}
              </div>
              {/* Price bubble */}
              <div style={{
                width: isPending ? (r * 2 + 16) : m.isSelected ? (r * 2 + 8) : r * 2,
                height: isPending ? (r * 2 + 16) : m.isSelected ? (r * 2 + 8) : r * 2,
                borderRadius: '50%',
                backgroundColor: 'var(--color-owner-tint)',
                border: `${isPending ? 3 : m.isSelected ? 3 : 2}px solid var(--color-owner)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                boxShadow: isPending
                  ? '0 0 0 4px rgba(var(--brand-owner-rgb),0.20), 0 0 24px rgba(var(--brand-owner-rgb),0.55)'
                  : isActive ? '0 0 20px rgba(var(--brand-owner-rgb),0.6)' : 'none',
              }}>
                <div style={{
                  width: Math.max(r * 0.5, 4),
                  height: Math.max(r * 0.5, 4),
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-owner)',
                  opacity: (m.isSelected || isPending) ? 1 : 0.85,
                }} />
              </div>
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
            background: 'var(--color-surface-raised)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(var(--brand-owner-rgb),0.30)',
            borderLeft: '3px solid var(--color-owner)',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            minWidth: '180px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-text)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
              {hovered.metro}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--color-owner)', fontWeight: 600 }}>{fmtCAD.format(hovered.medianPrice)}</span>
              {' '}median price
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{fmtCAD.format(hovered.monthlyRent)}/mo</span>
              {' '}est. rent
            </div>
            {hovered.propertyTaxPct != null && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                Property tax: <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{(hovered.propertyTaxPct * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
