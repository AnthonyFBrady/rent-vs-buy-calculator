'use client';

import { Marker } from 'react-map-gl/maplibre';
import type { Province } from '@/engine';
import type { ProvinceMarker } from '../useMapState';
import { PROVINCE_METRICS, VERDICT_COLOR } from './ProvinceChoroplethLayer';

const VERDICT_LABEL: Record<string, string> = {
  'rent-favored': 'Rent favored',
  'buy-favored':  'Buy favored',
  'tie':          'Roughly tied',
};

interface Props {
  markers: ProvinceMarker[];
  interactive: boolean;
  onProvinceClick?: (province: Province) => void;
}

export function NationalView({ markers, interactive, onProvinceClick }: Props) {
  return (
    <>
      {markers.map(m => {
        const metric   = PROVINCE_METRICS.get(m.id);
        const vcolor   = metric ? (VERDICT_COLOR[metric.verdict] ?? '#A1A1AA') : '#A1A1AA';
        const vLabel   = metric ? (VERDICT_LABEL[metric.verdict] ?? '') : '';

        if (m.isSelected) {
          return (
            <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="bottom">
              <div
                onClick={interactive && onProvinceClick ? () => onProvinceClick(m.id) : undefined}
                style={{
                  background: vcolor,
                  color: '#fff',
                  borderRadius: '7px',
                  padding: '5px 10px',
                  cursor: interactive ? 'pointer' : 'default',
                  boxShadow: `0 2px 10px ${vcolor}90, 0 0 0 2px ${vcolor}40`,
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  pointerEvents: 'all',
                  userSelect: 'none',
                  marginBottom: '6px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {m.label}
                </div>
                {vLabel && (
                  <div style={{ fontSize: '10px', fontWeight: 500, opacity: 0.92, marginTop: '2px' }}>
                    {vLabel}
                  </div>
                )}
              </div>
            </Marker>
          );
        }

        return (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
            <div
              onClick={interactive && onProvinceClick ? () => onProvinceClick(m.id) : undefined}
              title={`${m.label}${vLabel ? ' — ' + vLabel : ''}`}
              style={{
                background: 'rgba(255,255,255,0.82)',
                color: vcolor,
                border: `1.5px solid ${vcolor}`,
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                cursor: interactive ? 'pointer' : 'default',
                opacity: 0.80,
                pointerEvents: 'all',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
              }}
            >
              {m.id}
            </div>
          </Marker>
        );
      })}
    </>
  );
}
