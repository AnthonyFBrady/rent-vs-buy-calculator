'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput, Toggle, StepAdvanced } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

const FHSA_MAX = 40_000;
const HBP_MAX  = 60_000;

export function StepDownPayment({ inputs, patch }: Props) {
  const downPct    = Math.round(inputs.downPaymentPct * 100);
  const downAmount = inputs.homePrice * inputs.downPaymentPct;
  const isCMHC     = inputs.downPaymentPct < 0.2;
  const closingApprox = inputs.homePrice * 0.02;
  const priorEquity   = inputs.ownerPriorEquity ?? 0;
  const hasEquity     = priorEquity > 0;
  const extraSavings  = Math.max(0, priorEquity - downAmount - closingApprox);

  const fhsaDown   = inputs.ownerFhsaDown   ?? 0;
  const hbpDown    = inputs.ownerRrspHbpDown ?? 0;
  const hasFhsa    = fhsaDown > 0;
  const hasHbp     = hbpDown  > 0;

  const fhsaCredit = fhsaDown * (inputs.marginalTaxRatePct ?? 0.43);
  const hbpAnnual  = hasHbp ? hbpDown / 15 : 0;

  const surplusRrsp   = inputs.ownerSurplusRrspAmt ?? 0;
  const surplusTfsa   = inputs.ownerSurplusTfsaAmt ?? 0;
  const surplusTaxable = Math.max(0, extraSavings - surplusRrsp - surplusTfsa);

  const birthYear = inputs.birthYear ?? 1990;
  const tfsaEligibleSince = Math.max(birthYear + 18, 2009);
  const ownerTfsaRoom = Math.min(95_000, Math.max(0, (2026 - tfsaEligibleSince) * 7_000));
  const rrspAnnualRoom = Math.min(Math.round((inputs.annualIncome ?? 120_000) * 0.18), 31_560);
  const tfsaSliderMax = Math.min(Math.max(0, extraSavings - surplusRrsp), ownerTfsaRoom);

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
            // Clamp account amounts to new down payment
            ownerFhsaDown:   Math.min(fhsaDown, Math.min(FHSA_MAX, newDown)),
            ownerRrspHbpDown: Math.min(hbpDown, Math.min(HBP_MAX, newDown)),
          });
        }}
        formatValue={(v) => `${v}%`}
        color="var(--color-owner)"
        minLabel="5% min"
        maxLabel="50%"
        description={fmtCAD.format(downAmount)}
      />

      {isCMHC && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-negative)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          Under 20% — CMHC insurance premium added to mortgage balance (2.8–4.0%).
        </p>
      )}

      {/* Down payment sources */}
      <StepAdvanced label="Down payment sources">
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px', fontFamily: 'var(--font-sans), system-ui, sans-serif', lineHeight: 1.5 }}>
          Tax-advantaged accounts affect the true cost of buying. FHSA contributions generate a refund; RRSP HBP withdrawals require repayment over 15 years.
        </p>

        {/* FHSA */}
        <div style={{ marginBottom: '20px' }}>
          <Toggle
            checked={hasFhsa}
            onChange={(v) => patch({ ownerFhsaDown: v ? Math.min(FHSA_MAX, downAmount) : 0 })}
            label="Used FHSA toward down payment"
            description={hasFhsa
              ? `Adds ${fmtCAD.format(fhsaCredit)} to your starting portfolio (prior-year tax refunds).`
              : 'First Home Savings Account — up to $40,000 lifetime, tax-deductible + tax-free withdrawal.'}
          />
          {hasFhsa && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }} style={{ marginTop: '12px' }}>
              <RangeInput
                label={`FHSA amount: ${fmtCAD.format(fhsaDown)}`}
                value={Math.round(fhsaDown / 1000)}
                min={1}
                max={Math.round(Math.min(FHSA_MAX, downAmount) / 1000)}
                step={1}
                onChange={(v) => patch({ ownerFhsaDown: v * 1_000 })}
                formatValue={(v) => `$${v}k`}
                color="var(--color-owner)"
                minLabel="$1k"
                maxLabel={`$${Math.round(Math.min(FHSA_MAX, downAmount) / 1000)}k`}
                description={`Tax refund credit: +${fmtCAD.format(fhsaCredit)} added to your portfolio at year 0.`}
              />
            </motion.div>
          )}
        </div>

        {/* RRSP HBP */}
        <div>
          <Toggle
            checked={hasHbp}
            onChange={(v) => patch({ ownerRrspHbpDown: v ? Math.min(HBP_MAX, downAmount) : 0 })}
            label="Used RRSP Home Buyers' Plan"
            description={hasHbp
              ? `Adds ${fmtCAD.format(hbpAnnual)}/yr repayment to your annual costs for up to 15 years.`
              : 'Withdraw up to $60,000 tax-free. Must repay over 15 years or it counts as income.'}
          />
          {hasHbp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }} style={{ marginTop: '12px' }}>
              <RangeInput
                label={`HBP amount: ${fmtCAD.format(hbpDown)}`}
                value={Math.round(hbpDown / 1000)}
                min={1}
                max={Math.round(Math.min(HBP_MAX, downAmount) / 1000)}
                step={1}
                onChange={(v) => patch({ ownerRrspHbpDown: v * 1_000 })}
                formatValue={(v) => `$${v}k`}
                color="var(--color-owner)"
                minLabel="$1k"
                maxLabel={`$${Math.round(Math.min(HBP_MAX, downAmount) / 1000)}k`}
                description={`Repayment: ${fmtCAD.format(hbpAnnual)}/yr for ${Math.min(15, inputs.holdingPeriodYears)} years of your ${inputs.holdingPeriodYears}-year horizon.`}
              />
            </motion.div>
          )}
        </div>

        {/* Summary when either is active */}
        {(hasFhsa || hasHbp) && (
          <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-outline)', backgroundColor: 'var(--color-bg-elevated)' }}>
            <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              Net impact on simulation
            </p>
            {hasFhsa && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                <span>FHSA refund (year 0 portfolio credit)</span>
                <span style={{ color: 'var(--color-renter)', fontWeight: 500 }}>+{fmtCAD.format(fhsaCredit)}</span>
              </div>
            )}
            {hasHbp && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <span>HBP repayment (annual extra cost)</span>
                <span style={{ color: 'var(--color-negative)', fontWeight: 500 }}>+{fmtCAD.format(hbpAnnual)}/yr</span>
              </div>
            )}
          </div>
        )}
      </StepAdvanced>

      {/* Prior equity / surplus savings */}
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

          <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--color-outline)', backgroundColor: 'var(--color-bg-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <span>Down payment</span>
              <span>{fmtCAD.format(downAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <span>Closing costs (est. 2%)</span>
              <span>~{fmtCAD.format(closingApprox)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text)', borderTop: '1px solid var(--color-outline)', paddingTop: '6px', marginTop: '2px', fontWeight: 500 }}>
              <span>Invested on day 1</span>
              <span>{fmtCAD.format(extraSavings)}</span>
            </div>
          </div>

          {extraSavings > 500 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                Where does this get invested? Remainder goes non-registered.
              </p>

              <RangeInput
                label={`RRSP: ${fmtCAD.format(surplusRrsp)}`}
                value={Math.round(surplusRrsp / 1000)}
                min={0}
                max={Math.round(extraSavings / 1000)}
                step={1}
                onChange={(v) => {
                  const rrsp = v * 1_000;
                  patch({
                    ownerSurplusRrspAmt: rrsp,
                    ownerSurplusUsesRRSP: rrsp > 0,
                    ownerSurplusTfsaAmt: Math.min(surplusTfsa, Math.max(0, extraSavings - rrsp)),
                  });
                }}
                formatValue={(v) => `$${v}k`}
                color="var(--color-owner)"
                minLabel="$0"
                maxLabel={`$${Math.round(extraSavings / 1000)}k`}
                description={`Generates a tax refund at year 0. Annual room est. ${fmtCAD.format(rrspAnnualRoom)} — total may be higher from carryforward.`}
              />

              <div style={{ marginTop: '12px' }}>
                <RangeInput
                  label={`TFSA: ${fmtCAD.format(surplusTfsa)}`}
                  value={Math.round(surplusTfsa / 1000)}
                  min={0}
                  max={Math.round(extraSavings / 1000)}
                  step={1}
                  onChange={(v) => {
                    const tfsa = Math.min(v * 1_000, Math.max(0, extraSavings - surplusRrsp), ownerTfsaRoom);
                    patch({
                      ownerSurplusTfsaAmt: tfsa,
                      ownerSurplusUsesTFSA: tfsa > 0,
                    });
                  }}
                  formatValue={(v) => `$${v}k`}
                  color="var(--color-owner)"
                  minLabel="$0"
                  maxLabel={`$${Math.round(extraSavings / 1000)}k`}
                  description={`Tax-free growth, no capital gains at exit. Est. lifetime TFSA room: ${fmtCAD.format(ownerTfsaRoom)}.`}
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)', padding: '8px 0', borderTop: '1px solid var(--color-outline)' }}>
                <span>Non-registered (remainder)</span>
                <span style={{ fontWeight: 500 }}>{fmtCAD.format(surplusTaxable)}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
