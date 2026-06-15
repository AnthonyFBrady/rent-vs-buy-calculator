'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepWrapper, TrustSignal } from '../components';

const TERM_OPTIONS = [1, 2, 3, 5, 7, 10] as const;

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepMortgageRate({ inputs, patch }: Props) {
  const term = inputs.mortgageTermYears ?? 5;
  const holdingPeriod = inputs.holdingPeriodYears;
  const needsRenewal = holdingPeriod > term;
  const renewalRate = inputs.mortgageRenewalRatePct ?? inputs.mortgageRatePct;

  const computeMonthly = (ratePct: number) => {
    const principal = inputs.homePrice * (1 - inputs.downPaymentPct);
    const effectiveMonthly = Math.pow(1 + ratePct / 2, 1 / 6) - 1;
    const n = inputs.amortizationYears * 12;
    if (effectiveMonthly === 0 || n <= 0) return principal / n;
    return principal * effectiveMonthly / (1 - Math.pow(1 + effectiveMonthly, -n));
  };

  const monthlyPayment = computeMonthly(inputs.mortgageRatePct);
  const renewalMonthly = computeMonthly(renewalRate);
  const numRenewals = needsRenewal ? Math.ceil(holdingPeriod / term) - 1 : 0;

  return (
    <StepWrapper
      heading="Mortgage rate."
      description="Your first-term rate drives the monthly payment. If your hold spans multiple terms, set a renewal rate too."
    >
      <div className="mt-6">
        <RangeInput
          label="Initial rate"
          value={inputs.mortgageRatePct * 100}
          min={2}
          max={10}
          step={0.25}
          onChange={(v) => patch({ mortgageRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(2)}%`}
          color="var(--color-owner)"
          minLabel="2%"
          maxLabel="10%"
          description={monthlyPayment > 0
            ? `Monthly payment: $${Math.round(monthlyPayment).toLocaleString('en-CA')} P+I at this rate.`
            : 'Rate for your first term.'}
        />

        <div style={{ marginTop: '24px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
            marginBottom: '10px',
          }}>
            Term length
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TERM_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => patch({ mortgageTermYears: t })}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '9999px',
                  border: '1.5px solid',
                  borderColor: term === t ? 'var(--color-owner)' : 'var(--color-outline)',
                  backgroundColor: term === t ? 'var(--color-owner)' : 'transparent',
                  color: term === t ? '#fff' : 'var(--color-text-muted)',
                  fontSize: '13px',
                  fontWeight: term === t ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                }}
              >
                {t}yr
              </button>
            ))}
          </div>
          <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
            {needsRenewal
              ? `Your ${holdingPeriod}-year hold spans ${numRenewals + 1} term${numRenewals + 1 > 1 ? 's' : ''}. At each renewal, payments recalculate on the remaining balance.`
              : `Your ${holdingPeriod}-year hold fits within one ${term}-year term. No renewal needed.`}
          </p>
        </div>

        {needsRenewal && (
          <div style={{
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: '1px solid var(--color-outline)',
          }}>
            <RangeInput
              label={`Renewal rate — year ${term}${numRenewals > 1 ? ` onward (${numRenewals} renewal${numRenewals > 1 ? 's' : ''})` : ''}`}
              value={renewalRate * 100}
              min={2}
              max={10}
              step={0.25}
              onChange={(v) => patch({ mortgageRenewalRatePct: v / 100 })}
              formatValue={(v) => `${v.toFixed(2)}%`}
              color="var(--color-owner)"
              minLabel="2%"
              maxLabel="10%"
              description={renewalMonthly > 0
                ? `Renewal payment: $${Math.round(renewalMonthly).toLocaleString('en-CA')} P+I on remaining balance.`
                : 'Rate applied at each renewal on remaining amortization.'}
            />
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-outline)',
            }}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: 'var(--color-text)' }}>Reference rates (June 2026):</strong> BoC policy rate 2.75% — down from 5% peak in 2023. Big 6 banks 5-yr fixed: ~4.8%. Broker rates: ~4.5%. Canadian historical avg 2000-2024: ~4.5%. Stress test requires qualifying at contract rate +2%.
              </p>
            </div>
          </div>
        )}

        {!needsRenewal && (
          <TrustSignal>
            One {term}-year term covers your full holding period. Set a longer hold or shorter term above to model renewal risk.
          </TrustSignal>
        )}
      </div>
    </StepWrapper>
  );
}
