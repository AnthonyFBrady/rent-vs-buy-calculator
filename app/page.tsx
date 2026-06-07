'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  defaultInputsFor,
  inputsToSearchParams,
  searchParamsToInputs,
  simulateSensitivity,
  suggestRent,
  withPWLBaseline,
  type CalculatorInputs,
  type Province,
  type RentSuggestion,
} from '@/engine';
import { CumulativeWealthChart } from '@/components/charts/CumulativeWealth';
import { FivePercentRuleBar } from '@/components/charts/FivePercentRule';
import { InfoTooltip } from '@/components/Tooltip';

const CAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

const CAD_COMPACT = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
  notation: 'compact',
});

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Calculator />
    </Suspense>
  );
}

function Calculator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputs, setInputs] = useState<CalculatorInputs>(() =>
    searchParamsToInputs(searchParams),
  );

  // Keep the rent in sync with the postal-code / home-price suggestion unless
  // the user has explicitly typed their own number.
  const [rentManuallyEdited, setRentManuallyEdited] = useState(false);

  const updateInputs = useCallback(
    (updater: (prev: CalculatorInputs) => CalculatorInputs) => {
      setInputs(updater);
    },
    [],
  );

  // Reflect inputs into the URL (debounced).
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = inputsToSearchParams(inputs);
      const qs = params.toString();
      router.replace(qs.length > 0 ? `/?${qs}` : '/', { scroll: false });
    }, 250);
    return () => clearTimeout(handle);
  }, [inputs, router]);

  const fairRent: RentSuggestion | null = useMemo(
    () => suggestRent(inputs.homePrice, inputs.postalCode),
    [inputs.homePrice, inputs.postalCode],
  );

  // Auto-sync rent with the fair-rent suggestion until the user types their own.
  useEffect(() => {
    if (rentManuallyEdited) return;
    if (!fairRent) return;
    const rounded = Math.round(fairRent.suggestedMonthlyRent / 25) * 25;
    if (rounded !== inputs.monthlyRent) {
      setInputs((p) => ({ ...p, monthlyRent: rounded }));
    }
  }, [fairRent, rentManuallyEdited, inputs.monthlyRent]);

  const sensitivity = useMemo(() => simulateSensitivity(inputs), [inputs]);
  const result = sensitivity.base;

  const verdict = result.fivePercentRule.verdict;
  const breakEvenRent = result.fivePercentRule.monthlyBreakEvenRent;

  const ownerWinning = result.exit.netAdvantageToOwner >= 0;

  return (
    <main id="main-content" className="min-h-screen pb-24">
      <div className="container-narrow">
        <Header inputs={inputs} />

        <SectionStep
          number="1"
          title="The house"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <PostalCodeInput
              value={inputs.postalCode}
              onChange={(v) =>
                updateInputs((p) => ({ ...p, postalCode: v.toUpperCase() }))
              }
            />
            <MoneyInput
              label="Home price"
              value={inputs.homePrice}
              onChange={(v) => updateInputs((p) => ({ ...p, homePrice: v }))}
              step={10_000}
            />
            <ProvinceSelect
              value={inputs.province}
              onChange={(v) => {
                setInputs(defaultInputsFor(v));
                setRentManuallyEdited(false);
              }}
            />
          </div>
        </SectionStep>

        <FairRentCard
          fairRent={fairRent}
          breakEvenRent={breakEvenRent}
          monthlyRent={inputs.monthlyRent}
          onRentChange={(v) => {
            setRentManuallyEdited(true);
            updateInputs((p) => ({ ...p, monthlyRent: v }));
          }}
          onResetRent={() => setRentManuallyEdited(false)}
          rentManuallyEdited={rentManuallyEdited}
        />

        <VerdictCard
          verdict={verdict}
          breakEvenRent={breakEvenRent}
          monthlyRent={inputs.monthlyRent}
          ownerWinning={ownerWinning}
          netAdvantage={Math.abs(result.exit.netAdvantageToOwner)}
          holdingPeriodYears={inputs.holdingPeriodYears}
        />

        <SectionStep
          number="2"
          title={`Over ${inputs.holdingPeriodYears} years`}
        >
          <p className="text-ink/70 max-w-2xl">
            Renting plus investing the difference ends at{' '}
            <strong className="text-rent">
              {CAD.format(result.exit.finalRenterWealth)}
            </strong>
            . Buying and selling at year {inputs.holdingPeriodYears} ends at{' '}
            <strong className="text-buy">
              {CAD.format(result.exit.finalOwnerWealth)}
            </strong>
            .
          </p>
          <div className="mt-6">
            <CumulativeWealthChart result={result} sensitivity={sensitivity} />
          </div>
        </SectionStep>

        <CommitmentCard
          commitment={result.commitment}
          holdingPeriodYears={inputs.holdingPeriodYears}
        />

        <details className="py-6 border-t border-ink/10">
          <summary className="cursor-pointer text-sm font-medium text-ink/80">
            How the 5% rule breaks down for this home
          </summary>
          <div className="mt-4">
            <FivePercentRuleBar
              rule={result.fivePercentRule}
              monthlyRent={inputs.monthlyRent}
            />
          </div>
        </details>

        <details className="py-6 border-t border-ink/10">
          <summary className="cursor-pointer text-sm font-medium text-ink/80">
            Customize this comparison
          </summary>
          <AdvancedInputs
            inputs={inputs}
            updateInputs={updateInputs}
            onPreset={() => setInputs((p) => withPWLBaseline(p))}
            onReset={() => {
              setInputs(defaultInputsFor(inputs.province));
              setRentManuallyEdited(false);
            }}
          />
        </details>

        <Footer />
      </div>
    </main>
  );
}

// ─── HEADER ────────────────────────────────────────────────────────────

function Header({ inputs }: { inputs: CalculatorInputs }) {
  return (
    <header className="pt-12 pb-8 border-b border-ink/10 flex items-start justify-between gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-ink/60">
          Canadian rent vs buy
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl mt-2">
          Should you rent or buy?
        </h1>
        <p className="mt-4 text-ink/70 max-w-xl">
          Tell us about the home. We&apos;ll show you what an equivalent rent
          looks like in that area, and what the math says about renting versus
          owning over the long run.
        </p>
      </div>
      <ShareButton inputs={inputs} />
    </header>
  );
}

// ─── SECTION HELPERS ───────────────────────────────────────────────────

function SectionStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 border-t border-ink/10">
      <div className="flex items-baseline gap-3">
        <span className="text-xs uppercase tracking-widest text-ink/40">
          Step {number}
        </span>
        <h2 className="font-serif text-xl text-ink/90">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

// ─── FAIR RENT ANCHOR ──────────────────────────────────────────────────

function FairRentCard({
  fairRent,
  breakEvenRent,
  monthlyRent,
  onRentChange,
  onResetRent,
  rentManuallyEdited,
}: {
  fairRent: RentSuggestion | null;
  breakEvenRent: number;
  monthlyRent: number;
  onRentChange: (v: number) => void;
  onResetRent: () => void;
  rentManuallyEdited: boolean;
}) {
  if (!fairRent) {
    return (
      <section className="py-8 border-t border-ink/10">
        <p className="text-ink/70 text-sm">
          Add a postal code to see a fair-rent estimate for that area.
        </p>
      </section>
    );
  }

  return (
    <section className="py-8 border-t border-ink/10">
      <div className="flex items-baseline gap-3">
        <span className="text-xs uppercase tracking-widest text-ink/40">
          The fair-rent anchor
        </span>
        <InfoTooltip label="Fair rent">
          This is what an equivalent rental for the same house would cost in
          the same area, based on current market price-to-rent ratios from
          Rentals.ca and CMHC data. It is the apples-to-apples comparison
          point for the rent-vs-buy decision.
        </InfoTooltip>
      </div>

      <p className="mt-4 text-ink/80">
        For this home in <strong>{fairRent.metro}</strong>, a fair monthly
        rent is about
      </p>

      <p className="mt-2 font-serif text-5xl sm:text-6xl text-rent">
        {CAD.format(fairRent.suggestedMonthlyRent)}
      </p>

      <p className="mt-3 text-xs text-ink/60">
        Effective price-to-rent ratio {fairRent.priceToRent.toFixed(1)}. Metro
        baseline {fairRent.basePriceToRent} at the median home price of{' '}
        {CAD_COMPACT.format(fairRent.metroMedianHomePrice)}. Rent scales
        sub-linearly with price tier.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 items-end">
        <MoneyInput
          label="Compare against (your number)"
          value={monthlyRent}
          onChange={onRentChange}
          step={25}
        />
        {rentManuallyEdited && (
          <button
            type="button"
            onClick={onResetRent}
            className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink underline self-center sm:self-end pb-3 text-left"
          >
            Reset to fair rent ({CAD.format(fairRent.suggestedMonthlyRent)})
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-ink/70">
        For the financial math to favor buying, your rent would need to be
        above the 5% Rule break-even of{' '}
        <strong className="text-ink">{CAD.format(breakEvenRent)}/mo</strong>.
        For renting to win, it just needs to be below that line.
      </p>
    </section>
  );
}

// ─── VERDICT CARD ──────────────────────────────────────────────────────

function VerdictCard({
  verdict,
  breakEvenRent,
  monthlyRent,
  ownerWinning,
  netAdvantage,
  holdingPeriodYears,
}: {
  verdict: 'rent-favored' | 'buy-favored' | 'tie';
  breakEvenRent: number;
  monthlyRent: number;
  ownerWinning: boolean;
  netAdvantage: number;
  holdingPeriodYears: number;
}) {
  const verdictTitle =
    verdict === 'rent-favored'
      ? 'Renting wins'
      : verdict === 'buy-favored'
        ? 'Buying wins'
        : 'It is a close call';

  const verdictColor =
    verdict === 'rent-favored'
      ? 'text-rent'
      : verdict === 'buy-favored'
        ? 'text-buy'
        : 'text-ink';

  const gapToBreakEven = monthlyRent - breakEvenRent;
  const gapDescription =
    Math.abs(gapToBreakEven) < 50
      ? 'almost exactly at the break-even line'
      : gapToBreakEven < 0
        ? `${CAD.format(Math.abs(gapToBreakEven))}/mo below the break-even line`
        : `${CAD.format(gapToBreakEven)}/mo above the break-even line`;

  return (
    <section className="py-10 border-t border-ink/10">
      <p className="text-xs uppercase tracking-widest text-ink/40">
        The verdict
      </p>
      <h2 className={`font-serif text-4xl sm:text-5xl mt-2 ${verdictColor}`}>
        {verdictTitle}
      </h2>
      <p className="mt-4 text-ink/80 max-w-2xl">
        Your rent of {CAD.format(monthlyRent)}/mo is {gapDescription}. Over{' '}
        {holdingPeriodYears} years, {ownerWinning ? 'buying' : 'renting'} ends
        up ahead by{' '}
        <strong className={ownerWinning ? 'text-buy' : 'text-rent'}>
          {CAD.format(netAdvantage)}
        </strong>
        .
      </p>
    </section>
  );
}

// ─── COMMITMENT CARD ───────────────────────────────────────────────────

function CommitmentCard({
  commitment,
  holdingPeriodYears,
}: {
  commitment: {
    renterStartingLumpSum: number;
    renterFirstYearMonthlyContribution: number;
    renterTotalInvested: number;
    ownerStartingCashOut: number;
    ownerFirstYearMonthlyCarry: number;
    ownerTotalOutOfPocket: number;
  };
  holdingPeriodYears: number;
}) {
  return (
    <section className="py-8 border-t border-ink/10">
      <div className="flex items-baseline gap-3">
        <span className="text-xs uppercase tracking-widest text-ink/40">
          The discipline check
        </span>
        <InfoTooltip label="Discipline check">
          The renter case only works if you actually invest the difference.
          This shows what each path requires you to put up.
        </InfoTooltip>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <CommitmentColumn
          tone="rent"
          title="Renter (invest the difference)"
          rows={[
            { label: 'Invest today', value: commitment.renterStartingLumpSum },
            {
              label: 'Monthly investment, year 1',
              value: commitment.renterFirstYearMonthlyContribution,
              suffix: '/mo',
            },
          ]}
          totalLabel={`Total invested over ${holdingPeriodYears} years`}
          totalValue={commitment.renterTotalInvested}
          note="If your savings discipline is below 100%, the renter wealth result shrinks proportionally."
        />
        <CommitmentColumn
          tone="buy"
          title="Owner (carry the home)"
          rows={[
            { label: 'Cash at closing', value: commitment.ownerStartingCashOut },
            {
              label: 'Monthly carry, year 1',
              value: commitment.ownerFirstYearMonthlyCarry,
              suffix: '/mo',
            },
          ]}
          totalLabel={`Total out-of-pocket over ${holdingPeriodYears} years`}
          totalValue={commitment.ownerTotalOutOfPocket}
          note="Mortgage P+I, property tax, maintenance, insurance. Equity buildup is separate."
        />
      </div>
    </section>
  );
}

function CommitmentColumn({
  tone,
  title,
  rows,
  totalLabel,
  totalValue,
  note,
}: {
  tone: 'rent' | 'buy';
  title: string;
  rows: { label: string; value: number; suffix?: string }[];
  totalLabel: string;
  totalValue: number;
  note: string;
}) {
  const borderColor = tone === 'rent' ? 'border-rent/30' : 'border-buy/30';
  const bgColor = tone === 'rent' ? 'bg-rent/5' : 'bg-buy/5';
  const labelColor = tone === 'rent' ? 'text-rent' : 'text-buy';
  const totalColor = tone === 'rent' ? 'text-rent' : 'text-buy';
  const dividerColor = tone === 'rent' ? 'border-rent/20' : 'border-buy/20';

  return (
    <div className={`border ${borderColor} ${bgColor} p-4`}>
      <p className={`text-xs uppercase tracking-widest ${labelColor}`}>
        {title}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex justify-between gap-3">
            <span className="text-ink/70">{r.label}</span>
            <strong>
              {CAD.format(r.value)}
              {r.suffix ?? ''}
            </strong>
          </li>
        ))}
        <li
          className={`flex justify-between gap-3 pt-2 border-t ${dividerColor}`}
        >
          <span className="text-ink/70">{totalLabel}</span>
          <strong className={totalColor}>{CAD.format(totalValue)}</strong>
        </li>
      </ul>
      <p className="mt-3 text-xs text-ink/60">{note}</p>
    </div>
  );
}

// ─── ADVANCED ──────────────────────────────────────────────────────────

function AdvancedInputs({
  inputs,
  updateInputs,
  onPreset,
  onReset,
}: {
  inputs: CalculatorInputs;
  updateInputs: (updater: (prev: CalculatorInputs) => CalculatorInputs) => void;
  onPreset: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink/70">
        <span className="uppercase tracking-widest">Presets:</span>
        <button
          type="button"
          onClick={onPreset}
          className="border border-ink/20 px-2 py-1 uppercase tracking-widest hover:border-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
        >
          PWL 2005-2024 baseline
        </button>
        <button
          type="button"
          onClick={onReset}
          className="border border-ink/20 px-2 py-1 uppercase tracking-widest hover:border-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
        >
          Reset to defaults
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        <NumberInput
          label="Maintenance %"
          value={inputs.maintenancePct}
          onChange={(v) => updateInputs((p) => ({ ...p, maintenancePct: v }))}
          step={0.0025}
          format="percent"
          min={0}
          max={0.05}
          tooltip="Annual upkeep cost as a share of home value. Felix's research suggests 1.5-2.5%, higher than the 1% rule of thumb."
        />
        <NumberInput
          label="Property tax %"
          value={inputs.propertyTaxPct}
          onChange={(v) => updateInputs((p) => ({ ...p, propertyTaxPct: v }))}
          step={0.0005}
          format="percent"
          min={0}
          max={0.025}
          tooltip="Annual municipal property tax as a share of assessed value."
        />
        <NumberInput
          label="Mortgage rate %"
          value={inputs.mortgageRatePct}
          onChange={(v) => updateInputs((p) => ({ ...p, mortgageRatePct: v }))}
          step={0.0025}
          format="percent"
          min={0}
          max={0.15}
          tooltip="Annual mortgage rate. Canadian convention uses semi-annual compounding."
          helperText="BoC 5-year posted is currently around 5.0%. Negotiated rates often run 75-150 bps below."
        />
        <NumberInput
          label="Investment return %"
          value={inputs.investmentReturnPct}
          onChange={(v) =>
            updateInputs((p) => ({ ...p, investmentReturnPct: v }))
          }
          step={0.0025}
          format="percent"
          min={0}
          max={0.15}
          tooltip="Expected nominal return on the renter's invested-difference portfolio. ~7% is roughly 4% real plus 3% inflation."
        />
        <NumberInput
          label="Home appreciation %"
          value={inputs.homeAppreciationPct}
          onChange={(v) =>
            updateInputs((p) => ({ ...p, homeAppreciationPct: v }))
          }
          step={0.0025}
          format="percent"
          min={-0.05}
          max={0.15}
          tooltip="Long-run real return on residential real estate is ~1% per Eichholtz et al. (2021). Add inflation for nominal."
        />
        <NumberInput
          label="Down payment %"
          value={inputs.downPaymentPct}
          onChange={(v) => updateInputs((p) => ({ ...p, downPaymentPct: v }))}
          step={0.01}
          format="percent"
          min={0.05}
          max={1}
          tooltip="Below 20% requires CMHC insurance, added to the mortgage. 5% is the regulatory minimum."
        />
        <NumberInput
          label="Investment fees %"
          value={inputs.investmentFeePct}
          onChange={(v) =>
            updateInputs((p) => ({ ...p, investmentFeePct: v }))
          }
          step={0.001}
          format="percent"
          min={0}
          max={0.03}
          tooltip="Low-cost Canadian ETF MER is ~0.2-0.6%. Full-service advisors are ~1.5-1.8% and often flip the result toward owning."
        />
        <NumberInput
          label="Savings discipline %"
          value={inputs.savingsDisciplinePct}
          onChange={(v) =>
            updateInputs((p) => ({ ...p, savingsDisciplinePct: v }))
          }
          step={0.05}
          format="percent"
          min={0}
          max={1}
          tooltip="The share of the rent-vs-own savings the renter actually invests."
        />
        <NumberInput
          label="Holding period (years)"
          value={inputs.holdingPeriodYears}
          onChange={(v) =>
            updateInputs((p) => ({ ...p, holdingPeriodYears: v }))
          }
          step={1}
          format="number"
          min={1}
          max={30}
          tooltip="How long you plan to stay. Transaction costs of 8-15% round-trip hurt short horizons."
        />
        <BoolToggle
          label="First-time buyer"
          value={inputs.isFirstTimeBuyer}
          onChange={(v) =>
            updateInputs((p) => ({ ...p, isFirstTimeBuyer: v }))
          }
          tooltip="Reduces land transfer tax in most provinces. Ontario rebate up to $4,000 provincial + $4,475 Toronto."
        />
        {inputs.province === 'ON' && (
          <BoolToggle
            label="Toronto (apply MLTT)"
            value={inputs.isTorontoMunicipalLTT ?? false}
            onChange={(v) =>
              updateInputs((p) => ({ ...p, isTorontoMunicipalLTT: v }))
            }
            tooltip="Toronto's Municipal Land Transfer Tax on top of the Ontario LTT. Roughly doubles the upfront tax."
          />
        )}
        <BoolToggle
          label="Renter uses TFSA"
          value={inputs.renterUsesTFSA}
          onChange={(v) => updateInputs((p) => ({ ...p, renterUsesTFSA: v }))}
          tooltip="If on, the renter's portfolio is sheltered. No capital gains tax at exit. Assumes contributions stay within TFSA room."
        />
      </div>
    </div>
  );
}

// ─── FOOTER ────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="pt-12 text-xs text-ink/50 flex flex-wrap gap-4 border-t border-ink/10 mt-8">
      <Link href="/methodology" className="underline">
        Methodology and citations
      </Link>
      <span>·</span>
      <span>
        Inspired by{' '}
        <a className="underline" href="https://www.youtube.com/@BenFelixCSI">
          Ben Felix
        </a>{' '}
        and PWL Capital research. Not financial advice.
      </span>
    </footer>
  );
}

// ─── INPUT PRIMITIVES ──────────────────────────────────────────────────

function ShareButton({ inputs }: { inputs: CalculatorInputs }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const params = inputsToSearchParams(inputs);
    const url = `${window.location.origin}/?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [inputs]);

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Copy shareable link"
      className="shrink-0 border border-ink/20 px-3 py-2 text-xs uppercase tracking-widest text-ink/70 hover:border-ink hover:text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-ink/40"
    >
      {copied ? 'Link copied' : 'Share this'}
    </button>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ink/60">
        {label}
      </span>
      <input
        type="number"
        value={String(value)}
        step={step}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          if (isNaN(raw)) return;
          onChange(raw);
        }}
        className="mt-1 w-full border border-ink/20 bg-white px-3 py-2 text-lg font-serif focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
      />
    </label>
  );
}

function PostalCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center text-xs uppercase tracking-widest text-ink/60">
        Postal code
        <InfoTooltip label="Postal code">
          Used to find the local market price-to-rent ratio. Only the first
          three characters (the FSA) matter for the lookup.
        </InfoTooltip>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. M5V 3A8"
        maxLength={7}
        autoComplete="postal-code"
        className="mt-1 w-full border border-ink/20 bg-white px-3 py-2 text-lg font-serif uppercase placeholder:normal-case placeholder:text-ink/30 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
      />
    </label>
  );
}

function ProvinceSelect({
  value,
  onChange,
}: {
  value: Province;
  onChange: (v: Province) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ink/60">
        Province
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Province)}
        className="mt-1 w-full border border-ink/20 bg-white px-3 py-2 text-lg font-serif focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
      >
        <option value="ON">Ontario</option>
        <option value="BC">British Columbia</option>
        <option value="AB">Alberta</option>
        <option value="QC">Quebec</option>
        <option value="MB">Manitoba</option>
        <option value="SK">Saskatchewan</option>
        <option value="NS">Nova Scotia</option>
        <option value="NB">New Brunswick</option>
        <option value="NL">Newfoundland</option>
        <option value="PE">PEI</option>
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step,
  format,
  min,
  max,
  tooltip,
  helperText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  format: 'currency' | 'percent' | 'number';
  min?: number;
  max?: number;
  tooltip?: string;
  helperText?: string;
}) {
  const display =
    format === 'percent' ? (value * 100).toFixed(2) : String(value);

  return (
    <label className="block">
      <span className="flex items-center text-xs uppercase tracking-widest text-ink/60">
        {label}
        {tooltip && <InfoTooltip label={label}>{tooltip}</InfoTooltip>}
      </span>
      <input
        type="number"
        value={display}
        step={format === 'percent' ? step * 100 : step}
        min={
          min !== undefined ? (format === 'percent' ? min * 100 : min) : undefined
        }
        max={
          max !== undefined ? (format === 'percent' ? max * 100 : max) : undefined
        }
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          if (isNaN(raw)) return;
          onChange(format === 'percent' ? raw / 100 : raw);
        }}
        className="mt-1 w-full border border-ink/20 bg-white px-3 py-2 text-lg font-serif focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/40"
      />
      {helperText && (
        <span className="mt-1 block text-xs text-ink/50">{helperText}</span>
      )}
    </label>
  );
}

function BoolToggle({
  label,
  value,
  onChange,
  tooltip,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  tooltip?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 border-ink/30 accent-buy focus:outline-none focus:ring-2 focus:ring-ink/40"
      />
      <span className="text-xs uppercase tracking-widest text-ink/60">
        {label}
      </span>
      {tooltip && <InfoTooltip label={label}>{tooltip}</InfoTooltip>}
    </label>
  );
}
