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

// Vivid amber — higher contrast than --color-owner (#92400E) on CartoDB Positron light basemap
const MARKER_COLOR = '#D97706';
const MARKER_TINT  = 'rgba(217,119,6,0.14)';

function markerRadius(price: number, maxPrice: number): number {
  if (maxPrice === 0) return 8;
  return 6 + (price / maxPrice) * 22;
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
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
        const isActive  = m.isSelected || isPending;
        const dimmed    = hasPending && !isPending;

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
                gap: '3px',
                cursor: onCityClick ? 'pointer' : 'default',
                pointerEvents: 'all',
                transition: 'opacity 0.25s ease',
                opacity: dimmed ? 0.28 : 1,
              }}
            >
              {/* City name — no white halo, readable on light Positron basemap */}
              <div style={{
                fontSize: '9px',
                fontWeight: 700,
                color: isActive ? MARKER_COLOR : '#1a1a1a',
                whiteSpace: 'nowrap',
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                lineHeight: 1.3,
              }}>
                {m.metro}
              </div>

              {/* Price bubble */}
              <div style={{
                width:  isPending ? (r * 2 + 16) : isActive ? (r * 2 + 8) : r * 2,
                height: isPending ? (r * 2 + 16) : isActive ? (r * 2 + 8) : r * 2,
                borderRadius: '50%',
                backgroundColor: MARKER_TINT,
                border: `${isPending ? 3 : isActive ? 3 : 2}px solid ${MARKER_COLOR}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                boxShadow: isPending
                  ? `0 0 0 4px rgba(217,119,6,0.18), 0 0 24px rgba(217,119,6,0.50)`
                  : isActive ? `0 0 18px rgba(217,119,6,0.55)` : 'none',
              }}>
                <div style={{
                  width:  Math.max(r * 0.5, 4),
                  height: Math.max(r * 0.5, 4),
                  borderRadius: '50%',
                  backgroundColor: MARKER_COLOR,
                  opacity: isActive ? 1 : 0.80,
                }} />
              </div>

              {/* Always-visible price label */}
              <div style={{
                fontSize: '8px',
                fontWeight: 700,
                color: isActive ? MARKER_COLOR : '#555',
                letterSpacing: '0.01em',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                lineHeight: 1,
              }}>
                {fmtShort(m.medianPrice)}
              </div>
            </div>
          </Marker>
        );
      })}

      {/* Dark tooltip on hover — shows full detail */}
      {hovered && (
        <Popup
          longitude={hovered.lng}
          latitude={hovered.lat}
          anchor="bottom"
          offset={42}
          closeButton={false}
          closeOnClick={false}
          style={{ zIndex: 10 }}
        >
          <div style={{
            background: 'rgba(16,16,16,0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '8px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.30)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            minWidth: '165px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff', marginBottom: '6px', letterSpacing: '-0.01em' }}>
              {hovered.metro}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{fmtCAD.format(hovered.medianPrice)}</span>
              {' '}median price
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{fmtCAD.format(hovered.monthlyRent)}/mo</span>
              {' '}est. rent
            </div>
            {hovered.propertyTaxPct != null && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
                Property tax:{' '}
                <span style={{ color: '#fff', fontWeight: 600 }}>{(hovered.propertyTaxPct * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
