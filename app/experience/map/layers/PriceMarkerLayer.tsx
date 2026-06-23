'use client';

import { Marker } from 'react-map-gl/maplibre';
import type { MetroMarker } from '../useMapState';

interface Props {
  markers: MetroMarker[];
  onCityClick?: (marker: MetroMarker) => void;
  /** FSA of the city the user has tapped but not yet confirmed. */
  pendingFSA?: string | null;
}

// Vivid amber — higher contrast than --color-owner (#92400E) on CartoDB Positron light basemap
const MARKER_COLOR = '#D97706';
const MARKER_TINT  = 'rgba(217,119,6,0.14)';

function markerRadius(price: number, maxPrice: number): number {
  if (maxPrice === 0) return 8;
  return 6 + (price / maxPrice) * 22;
}

// White halo makes text readable on any map background without a pill box
const TEXT_HALO = '0 0 3px #fff, 0 0 6px #fff, 0 0 10px rgba(255,255,255,0.7)';

export function PriceMarkerLayer({ markers, onCityClick, pendingFSA }: Props) {
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
              onClick={onCityClick ? () => onCityClick(m) : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: onCityClick ? 'pointer' : 'default',
                pointerEvents: 'all',
                transition: 'opacity 0.25s ease',
                opacity: dimmed ? 0.30 : 1,
              }}
            >
              {/* City name — halo only, no pill box */}
              <div style={{
                fontSize: '9px',
                fontWeight: 700,
                color: isActive ? MARKER_COLOR : '#111',
                whiteSpace: 'nowrap',
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                lineHeight: 1.3,
                textShadow: TEXT_HALO,
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
            </div>
          </Marker>
        );
      })}
    </>
  );
}
