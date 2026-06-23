'use client';

import { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import type { MetroMarker } from '../useMapState';

interface Props {
  markers: MetroMarker[];
}

const fmtCAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

const VERDICT_COLOR: Record<string, string> = {
  'rent-favored': '#0891B2',  // cyan-600 — matches ProvinceChoroplethLayer
  'buy-favored':  '#D97706',  // amber-600
  'tie':          '#6B7280',  // slate
};

const VERDICT_LABEL: Record<string, string> = {
  'rent-favored': 'Rent favored',
  'buy-favored':  'Buy favored',
  'tie':          'Roughly tied',
};

export function RentBuySignalLayer({ markers }: Props) {
  const [hovered, setHovered] = useState<MetroMarker | null>(null);

  const validMarkers = markers.filter(m => m.verdict !== null && m.medianPrice > 0);

  return (
    <>
      {validMarkers.map(m => {
        const color = VERDICT_COLOR[m.verdict ?? 'tie'] ?? '#6B7280';
        const isHovered = hovered?.id === m.id;
        return (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
            <div
              onMouseEnter={() => setHovered(m)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                pointerEvents: 'all',
                cursor: 'default',
              }}
            >
              {/* City name — halo only, no pill box */}
              <div style={{
                fontSize: '9px',
                fontWeight: 700,
                color,
                whiteSpace: 'nowrap',
                letterSpacing: '0.03em',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                lineHeight: 1.3,
                textShadow: '0 0 3px #fff, 0 0 6px #fff, 0 0 10px rgba(255,255,255,0.7)',
              }}>
                {m.metro}
              </div>
              {/* Verdict dot */}
              <div style={{
                width: isHovered ? 26 : 18,
                height: isHovered ? 26 : 18,
                borderRadius: '50%',
                backgroundColor: `${color}28`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isHovered ? `0 0 14px ${color}80` : 'none',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color }} />
              </div>
            </div>
          </Marker>
        );
      })}

      {hovered && hovered.verdict && (
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
            background: 'rgba(16,16,16,0.84)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '8px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.30)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            minWidth: '190px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff', marginBottom: '6px', letterSpacing: '-0.01em' }}>
              {hovered.metro}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              marginBottom: '8px',
              backgroundColor: `${VERDICT_COLOR[hovered.verdict]}38`,
              color: VERDICT_COLOR[hovered.verdict],
            }}>
              {VERDICT_LABEL[hovered.verdict]}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
              Break-even rent: <span style={{ color: '#fff' }}>
                {hovered.breakEvenRent != null ? fmtCAD.format(hovered.breakEvenRent) + '/mo' : '—'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
              Actual rent: <span style={{ color: '#fff' }}>{fmtCAD.format(hovered.monthlyRent)}/mo</span>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
