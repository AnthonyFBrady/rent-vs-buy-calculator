'use client';

import type { CalculatorInputs } from '@/engine';
import { FactorSlider } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const ZONES = [
  {
    range: 'Under 5 years',
    verdict: 'Renting almost always wins',
    color: 'var(--color-renter)',
    min: 0,
    max: 4,
  },
  {
    range: '5 to 10 years',
    verdict: 'Math starts to shift',
    color: '#A78BFA',
    min: 5,
    max: 9,
  },
  {
    range: '10 years or more',
    verdict: 'Buying gains a clear edge',
    color: 'var(--color-owner)',
    min: 10,
    max: Infinity,
  },
] as const;

export function StepHorizon({ inputs, patch }: Props) {
  const years = inputs.holdingPeriodYears ?? 10;
  const activeZone = ZONES.findIndex(z => years >= z.min && years <= z.max);

  return (
    <div>
      <FactorSlider
        factor={FACTORS.timeHorizon}
        inputs={inputs}
        patch={patch}
      />

      <div style={{ marginTop: '20px', display: 'flex', gap: '6px' }}>
        {ZONES.map((z, i) => {
          const active = i === activeZone;
          return (
            <div
              key={z.range}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1px solid ${active ? z.color : 'rgba(0,0,0,0.07)'}`,
                background: active ? `color-mix(in srgb, ${z.color} 10%, transparent)` : 'transparent',
                transition: 'border-color 0.25s, background 0.25s',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: active ? z.color : 'var(--color-text-dimmer)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '5px',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  transition: 'color 0.25s',
                }}
              >
                {z.range}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  lineHeight: 1.35,
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  transition: 'color 0.25s',
                }}
              >
                {z.verdict}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
