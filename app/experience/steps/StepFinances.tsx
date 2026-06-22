'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepAdvanced, FactorSlider } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

const CURRENT_YEAR = 2026;
const TFSA_ORIGIN_YEAR = 2009;
const TFSA_ANNUAL_ROOM = 7_000;
const RRSP_MAX = 31_560;

export function StepFinances({ inputs, patch }: Props) {
  const age = CURRENT_YEAR - (inputs.birthYear ?? 1990);
  const incomeK = Math.round((inputs.annualIncome ?? 120_000) / 1_000);

  const tfsaRoom = Math.min(
    95_000,
    Math.max(0, (CURRENT_YEAR - Math.max((inputs.birthYear ?? 1990) + 18, TFSA_ORIGIN_YEAR)) * TFSA_ANNUAL_ROOM),
  );
  const rrspRoom = Math.min((inputs.annualIncome ?? 120_000) * 0.18, RRSP_MAX);

  return (
    <div>
      {/* Age */}
      <div style={{ marginBottom: '28px' }}>
        <RangeInput
          label="Age"
          value={age}
          min={18}
          max={70}
          step={1}
          onChange={(v) => patch({ birthYear: CURRENT_YEAR - v })}
          formatValue={(v) => `${v}`}
          color="var(--color-renter)"
          minLabel="18"
          maxLabel="70"
          description={`Accumulated TFSA room: ${fmtCAD.format(tfsaRoom)}. Eligible since age 18 or 2009, whichever is later.`}
        />
      </div>

      {/* Annual income */}
      <div style={{ marginBottom: '8px' }}>
        <RangeInput
          label="Annual income"
          value={incomeK}
          min={40}
          max={300}
          step={5}
          onChange={(v) => patch({ annualIncome: v * 1_000 })}
          formatValue={(v) => `$${v}k`}
          color="var(--color-owner)"
          minLabel="$40k"
          maxLabel="$300k"
          description={`RRSP room: 18% of income = ${fmtCAD.format(Math.round(rrspRoom))}/yr, up to the ${fmtCAD.format(RRSP_MAX)} cap.`}
        />
      </div>

      <StepAdvanced label="Tax rate and investment return">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FactorSlider factor={FACTORS.marginalTax} inputs={inputs} patch={patch} />
          <FactorSlider factor={FACTORS.investmentReturn} inputs={inputs} patch={patch} />
          <FactorSlider factor={FACTORS.inflation} inputs={inputs} patch={patch} />
        </div>
      </StepAdvanced>
    </div>
  );
}
