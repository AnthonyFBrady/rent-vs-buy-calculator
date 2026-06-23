'use client';

import { useState } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import type { MetroMarker } from '../useMapState';

interface Props {
  markers: MetroMarker[];
}

const fmtCAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

const VERDICT_COLOR: Record<string, string> = {
  'rent-favored': '#0E7490',
  'buy-favored':  '#92400E',
  'tie':          '#6B7280',
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
                width: isHovered ? 28 : 20,
                height: isHovered ? 28 : 20,
                borderRadius: '50%',
                backgroundColor: `${color}28`,
                border: `2px solid ${color}`,
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: isHovered ? `0 0 14px ${color}80` : 'none',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: color,
                }}
              />
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
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-outline)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            minWidth: '190px',
          }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)', marginBottom: '6px' }}>
              {hovered.metro}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              marginBottom: '8px',
              backgroundColor: `${VERDICT_COLOR[hovered.verdict]}22`,
              color: VERDICT_COLOR[hovered.verdict],
            }}>
              {VERDICT_LABEL[hovered.verdict]}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Break-even rent: <span style={{ color: 'var(--color-text)' }}>
                {hovered.breakEvenRent != null ? fmtCAD.format(hovered.breakEvenRent) + '/mo' : '—'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Actual rent: <span style={{ color: 'var(--color-text)' }}>{fmtCAD.format(hovered.monthlyRent)}/mo</span>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
