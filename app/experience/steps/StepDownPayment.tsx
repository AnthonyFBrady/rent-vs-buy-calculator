'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput, Toggle } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

export function StepDownPayment({ inputs, patch }: Props) {
  const downPct    = Math.round(inputs.downPaymentPct * 100);
  const downAmount = inputs.homePrice * inputs.downPaymentPct;
  const isCMHC     = inputs.downPaymentPct < 0.2;
  const closingApprox = inputs.homePrice * 0.02;
  const priorEquity   = inputs.ownerPriorEquity ?? 0;
  const hasEquity     = priorEquity > 0;
  const extraSavings  = Math.max(0, priorEquity - downAmount - closingApprox);

  const selectedAlloc =
    (inputs.ownerSurplusUsesRRSP ?? false)  ? 'rrsp'    :
    (inputs.ownerSurplusUsesTFSA ?? false)  ? 'tfsa'    :
    'taxable';

  return (
    <div>
      <RangeInput
        label="Down payment"
        value={downPct}
        min={5}
        max={50}
        step={1}
        onChange={(v) => {
          const newDown = inputs.homePrice * (v / 100);
          const newClosing = inputs.homePrice * 0.02;
          patch({
            downPaymentPct: v / 100,
            ownerPriorEquity: hasEquity ? newDown + newClosing + extraSavings : 0,
          });
        }}
        formatValue={(v) => `${v}%`}
        color="var(--color-owner)"
        minLabel="5% min"
        maxLabel="50%"
        description={fmtCAD.format(downAmount)}
      />

      {isCMHC && (
        <p
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--color-negative)',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}
        >
          Under 20% — CMHC insurance premium added to mortgage balance (2.8–4.0%).
        </p>
      )}

      <div style={{ marginTop: '20px' }}>
        <Toggle
          checked={hasEquity}
          onChange={(v) => patch({
            ownerPriorEquity: v ? downAmount + closingApprox + 50_000 : 0,
          })}
          label="I have savings to invest after closing"
          description="The renter invests your down payment from day 1. This levels the field."
        />
      </div>

      {hasEquity && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          style={{ marginTop: '16px' }}
        >
          <RangeInput
            label="Savings to invest"
            value={Math.round(extraSavings / 1000)}
            min={10}
            max={2000}
            step={10}
            onChange={(v) => patch({ ownerPriorEquity: downAmount + closingApprox + v * 1_000 })}
            formatValue={(v) => `$${v}k`}
            color="var(--color-owner)"
            minLabel="$10k"
            maxLabel="$2M"
          />

          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--color-outline)',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <span>Down payment</span>
              <span>{fmtCAD.format(downAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <span>Closing costs (est. 2%)</span>
              <span>~{fmtCAD.format(closingApprox)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: '12px',
              color: 'var(--color-text)',
              borderTop: '1px solid var(--color-outline)',
              paddingTop: '6px', marginTop: '2px', fontWeight: 500,
            }}>
              <span>Invested on day 1</span>
              <span>{fmtCAD.format(extraSavings)}</span>
            </div>
          </div>

          {extraSavings > 500 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                Where does this get invested?
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['tfsa', 'rrsp', 'taxable'] as const).map((type) => {
                  const selected = type === selectedAlloc;
                  return (
                    <button
                      key={type}
                      onClick={() => patch({
                        ownerSurplusUsesTFSA: type === 'tfsa',
                        ownerSurplusUsesRRSP: type === 'rrsp',
                      })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        border: `1px solid ${selected ? 'var(--color-owner)' : 'var(--color-outline)'}`,
                        background: selected
                          ? 'color-mix(in srgb, var(--color-owner) 10%, transparent)'
                          : 'none',
                        color: selected ? 'var(--color-owner)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      }}
                    >
                      {type === 'tfsa' ? 'TFSA' : type === 'rrsp' ? 'RRSP' : 'Non-registered'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
