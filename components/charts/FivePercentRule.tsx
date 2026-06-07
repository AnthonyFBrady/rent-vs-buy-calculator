'use client';

import type { FivePercentRuleResult } from '@/engine';

interface Props {
  rule: FivePercentRuleResult;
  monthlyRent: number;
}

/**
 * Stacked horizontal bar showing the 1+1+3 decomposition of the 5% Rule.
 * Each component shown as a colored segment with its share of the total.
 */
export function FivePercentRuleBar({ rule, monthlyRent }: Props) {
  const total = rule.totalUnrecoverablePct;
  const tax = rule.components.propertyTaxPct;
  const maint = rule.components.maintenancePct;
  const cap = rule.components.costOfCapitalPct;

  const taxPct = (tax / total) * 100;
  const maintPct = (maint / total) * 100;
  const capPct = (cap / total) * 100;

  const fmtPct = (v: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(v);

  const fmtCAD = (v: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div>
      <div className="flex w-full overflow-hidden rounded-sm border border-ink/10">
        <Segment
          widthPct={taxPct}
          label="Property tax"
          value={fmtPct(tax)}
          bg="bg-buy/20"
          fg="text-buy-dark"
        />
        <Segment
          widthPct={maintPct}
          label="Maintenance"
          value={fmtPct(maint)}
          bg="bg-buy/40"
          fg="text-buy-dark"
        />
        <Segment
          widthPct={capPct}
          label="Cost of capital"
          value={fmtPct(cap)}
          bg="bg-buy/70"
          fg="text-white"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/60">
            Annual unrecoverable cost of owning
          </p>
          <p className="font-serif text-xl mt-1">
            {fmtCAD(rule.annualUnrecoverable)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/60">
            Break-even monthly rent
          </p>
          <p className="font-serif text-xl mt-1">
            {fmtCAD(rule.monthlyBreakEvenRent)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink/60">
        Your rent of {fmtCAD(monthlyRent)} is{' '}
        {rule.marginPctOfThreshold >= 0 ? '+' : ''}
        {(rule.marginPctOfThreshold * 100).toFixed(1)}% relative to the
        break-even threshold.
      </p>
    </div>
  );
}

function Segment({
  widthPct,
  label,
  value,
  bg,
  fg,
}: {
  widthPct: number;
  label: string;
  value: string;
  bg: string;
  fg: string;
}) {
  return (
    <div
      className={`${bg} ${fg} px-3 py-2 flex flex-col justify-center`}
      style={{ width: `${widthPct}%` }}
    >
      <span className="text-[10px] uppercase tracking-widest opacity-80">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
