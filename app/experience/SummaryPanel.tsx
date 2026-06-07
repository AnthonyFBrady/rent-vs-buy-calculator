'use client';

import { motion } from 'motion/react';
import type { SimulationResult } from '@/engine';

interface Props {
  sim: SimulationResult;
  isDark: boolean;
  onClose: () => void;
}

const OWNER_COLOR = 'var(--color-owner)';
const RENTER_COLOR = 'var(--color-renter)';

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

function Row({
  label,
  value,
  isPositive,
  isMuted,
  isBold,
  isDark,
}: {
  label: string;
  value: number;
  isPositive: boolean;
  isMuted?: boolean;
  isBold?: boolean;
  isDark: boolean;
}) {
  const positiveColor = isDark ? '#99B56E' : '#486635';
  const negativeColor = isDark ? '#FF8A71' : '#A43D12';
  return (
    <div
      className={`flex items-baseline justify-between py-3 ${
        isBold ? 'border-t border-outline' : ''
      }`}
    >
      <span className={`text-sm ${isMuted ? 'opacity-50' : ''}`}>{label}</span>
      <span
        className={`font-serif text-base tabular-nums ${isBold ? 'text-lg' : ''}`}
        style={{ color: isPositive ? positiveColor : value === 0 ? undefined : negativeColor }}
      >
        {isPositive && value > 0 ? '+' : ''}
        {fmt.format(value)}
      </span>
    </div>
  );
}

export function SummaryPanel({ sim, isDark, onClose }: Props) {
  const { exit, inputs, yearByYear } = sim;
  const bgColor = 'var(--color-surface)';
  const borderColor = 'var(--color-outline)';
  const textColor = 'var(--color-text)';
  const mutedColor = 'var(--color-text-muted)';
  const dividerColor = 'var(--color-outline)';

  const totalOwnerCarry = yearByYear.reduce((s, y) => s + y.ownerAnnualCashOut, 0);
  const totalRenterCarry = yearByYear.reduce((s, y) => s + y.renterAnnualCashOut, 0);
  const totalRenterInvested = sim.commitment.renterStartingLumpSum +
    yearByYear.reduce((s, y) => s + y.renterPortfolioContribution, 0);

  const totalOwnerInterest = yearByYear.reduce((s, y) => s + y.ownerAnnualInterest, 0);
  const totalOwnerTax = yearByYear.reduce((s, y) => s + y.ownerAnnualPropertyTax, 0);
  const totalOwnerMaint = yearByYear.reduce((s, y) => s + y.ownerAnnualMaintenance, 0);
  const totalOwnerIns = yearByYear.reduce((s, y) => s + y.ownerAnnualInsurance, 0);
  const totalOwnerStrata = yearByYear.reduce((s, y) => s + y.ownerAnnualStrata, 0);
  const totalOwnerUnrecoverable = totalOwnerInterest + totalOwnerTax + totalOwnerMaint + totalOwnerIns + totalOwnerStrata;
  const totalRenterUnrecoverable = yearByYear.reduce((s, y) => s + y.renterAnnualRent, 0);

  const finalHomeValue = inputs.homePrice * Math.pow(1 + inputs.homeAppreciationPct, inputs.holdingPeriodYears);
  const homeCapitalGain = Math.max(0, finalHomeValue - inputs.homePrice);
  const preTaxEquivalent = homeCapitalGain * 0.5 * inputs.marginalTaxRatePct;

  const advantage = exit.netAdvantageToOwner;
  const winner = advantage > 5000 ? 'buy' : advantage < -5000 ? 'rent' : 'tie';

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="fixed inset-x-0 bottom-0 z-50 overflow-y-auto"
      style={{
        backgroundColor: bgColor,
        borderTop: `1px solid ${borderColor}`,
        maxHeight: '80vh',
        color: textColor,
      }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3">
        <div
          className="h-1 w-10 rounded-full"
          style={{ backgroundColor: 'var(--color-outline)' }}
        />
      </div>

      <div className="px-8 pb-16 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-6">
          <div>
            <p className="font-medium">Full breakdown</p>
            <p className="mt-1 text-sm" style={{ color: mutedColor }}>
              {inputs.holdingPeriodYears}-year horizon
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              color: mutedColor,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Winner banner */}
        <div
          className="mb-8 rounded-sm px-5 py-4"
          style={{
            backgroundColor: isDark
              ? winner === 'buy'
                ? 'rgba(232,200,122,0.08)'
                : 'rgba(108,191,184,0.08)'
              : winner === 'buy'
              ? 'rgba(232,200,122,0.12)'
              : 'rgba(108,191,184,0.12)',
            border: `1px solid ${winner === 'buy' ? 'rgba(232,200,122,0.2)' : 'rgba(108,191,184,0.2)'}`,
          }}
        >
          <p
            className="font-serif text-xl leading-snug"
            style={{ color: winner === 'buy' ? OWNER_COLOR : RENTER_COLOR }}
          >
            {winner === 'buy'
              ? `Buying leads by ${fmt.format(Math.abs(advantage))}`
              : winner === 'rent'
              ? `Renting leads by ${fmt.format(Math.abs(advantage))}`
              : 'Roughly a tie'}
          </p>
          {sim.breakEvenYear && (
            <p className="mt-1 text-xs" style={{ color: mutedColor }}>
              {winner === 'rent'
                ? `Owner crosses ahead at year ${sim.breakEvenYear}, then renter pulls back.`
                : `Crossover at year ${sim.breakEvenYear}.`}
            </p>
          )}
        </div>

        {/* Two columns */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Owner column */}
          <div>
            <p
              className="mb-1 text-xs uppercase tracking-widest"
              style={{ color: OWNER_COLOR }}
            >
              Owner
            </p>

            <div style={{ borderTop: `1px solid ${dividerColor}` }}>
              <Row label="Down payment" value={-inputs.homePrice * inputs.downPaymentPct} isPositive={false} isMuted isDark={isDark} />
              <Row label="LTT + legal + CMHC" value={-(exit.ownerRealtorCommission > 0 ? sim.commitment.ownerStartingCashOut - inputs.homePrice * inputs.downPaymentPct : 0)} isPositive={false} isMuted isDark={isDark} />
              <Row label={`${inputs.holdingPeriodYears}yr carrying costs`} value={-totalOwnerCarry} isPositive={false} isMuted isDark={isDark} />
              <Row label="Home sale proceeds" value={exit.ownerHomeNetProceeds} isPositive isDark={isDark} />
              {exit.ownerPortfolioValue > 0 && (
                <Row label="Invested surplus (after tax)" value={exit.ownerPortfolioNetProceeds} isPositive isDark={isDark} />
              )}
              <Row label="Final wealth" value={exit.finalOwnerWealth} isPositive={exit.finalOwnerWealth > 0} isBold isDark={isDark} />
            </div>
          </div>

          {/* Renter column */}
          <div>
            <p
              className="mb-1 text-xs uppercase tracking-widest"
              style={{ color: RENTER_COLOR }}
            >
              Renter
            </p>

            <div style={{ borderTop: `1px solid ${dividerColor}` }}>
              <Row label="Starting lump sum invested" value={-sim.commitment.renterStartingLumpSum} isPositive={false} isMuted isDark={isDark} />
              <Row label="First + last deposit (upfront)" value={-2 * inputs.monthlyRent} isPositive={false} isMuted isDark={isDark} />
              <Row label={`${inputs.holdingPeriodYears}yr carrying costs`} value={-totalRenterCarry} isPositive={false} isMuted isDark={isDark} />
              <Row label="Portfolio (after tax)" value={exit.renterPortfolioValue - exit.renterCapitalGainsTax} isPositive isDark={isDark} />
              {exit.renterRrspBalance > 0 && (
                <Row label="RRSP (after tax)" value={exit.renterRrspBalance - exit.renterRrspExitTax} isPositive isDark={isDark} />
              )}
              <Row label="Deposit returned" value={exit.renterDepositReturned} isPositive isDark={isDark} />
              <Row label="Final wealth" value={exit.finalRenterWealth} isPositive={exit.finalRenterWealth > 0} isBold isDark={isDark} />
            </div>
          </div>
        </div>

        {/* Discipline requirement */}
        <div
          className="mt-8 rounded-sm px-5 py-4"
          style={{ border: `1px solid ${dividerColor}` }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: mutedColor }}>
            What it takes for the renter to match this
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: textColor }}>
            The renter must invest{' '}
            <span style={{ color: RENTER_COLOR }}>
              {fmt.format(sim.commitment.renterStartingLumpSum)}
            </span>{' '}
            upfront and{' '}
            <span style={{ color: RENTER_COLOR }}>
              {fmt.format(sim.commitment.renterFirstYearMonthlyContribution)}/mo
            </span>{' '}
            in year 1 — escalating with the cash-flow gap each year.
            Total invested:{' '}
            <span style={{ color: RENTER_COLOR }}>
              {fmt.format(totalRenterInvested)}
            </span>
            .
          </p>
        </div>

        {/* Unrecoverable costs comparison */}
        <div className="mt-6 rounded-sm px-5 py-4" style={{ border: `1px solid ${dividerColor}` }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: mutedColor }}>
            Unrecoverable costs over {inputs.holdingPeriodYears} years
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: OWNER_COLOR }}>Owner</p>
              <p className="font-serif text-lg tabular-nums">{fmt.format(Math.round(totalOwnerUnrecoverable))}</p>
              <p className="mt-1 text-[10px] leading-relaxed" style={{ color: mutedColor }}>
                Interest {fmt.format(Math.round(totalOwnerInterest))} + tax {fmt.format(Math.round(totalOwnerTax))} + maint {fmt.format(Math.round(totalOwnerMaint))} + ins {fmt.format(Math.round(totalOwnerIns))}{totalOwnerStrata > 0 ? ` + strata ${fmt.format(Math.round(totalOwnerStrata))}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: RENTER_COLOR }}>Renter</p>
              <p className="font-serif text-lg tabular-nums">{fmt.format(Math.round(totalRenterUnrecoverable))}</p>
              <p className="mt-1 text-[10px] leading-relaxed" style={{ color: mutedColor }}>Rent paid in total</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed" style={{ color: mutedColor }}>
            Costs that build no equity. Ben Felix: the owner&apos;s unrecoverable costs often exceed rent — the breakeven horizon is when home appreciation closes the gap.
          </p>
        </div>

        {/* PRE tax advantage */}
        {preTaxEquivalent > 5000 && (
          <div className="mt-4 rounded-sm px-5 py-4" style={{ border: `1px solid ${dividerColor}` }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: mutedColor }}>
              Tax advantage (Principal Residence Exemption)
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: textColor }}>
              Home capital gain of{' '}
              <span style={{ color: OWNER_COLOR }}>{fmt.format(Math.round(homeCapitalGain))}</span>{' '}
              is fully tax-exempt. The equivalent gain in a taxable account would have incurred{' '}
              <span style={{ color: OWNER_COLOR }}>~{fmt.format(Math.round(preTaxEquivalent))}</span>{' '}
              in tax at a 50% inclusion rate.
            </p>
            <p className="mt-2 text-[10px] leading-relaxed" style={{ color: mutedColor }}>
              The PRE is the single largest tax advantage available to Canadian homeowners. It is not available in any other asset class.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
