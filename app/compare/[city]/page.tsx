import { notFound } from 'next/navigation';
import Link from 'next/link';
import { simulate, defaultInputsFor } from '@/engine';
import type { CalculatorInputs } from '@/engine';
import { CityChart } from './CityChart';

export const dynamic = 'force-static';

type CityKey = 'toronto' | 'vancouver' | 'calgary' | 'ottawa' | 'montreal' | 'edmonton';

interface CityConfig {
  label: string;
  overrides: Partial<CalculatorInputs>;
}

const CITIES: Record<CityKey, CityConfig> = {
  toronto: {
    label: 'Toronto',
    overrides: {
      province: 'ON',
      homePrice: 1_050_000,
      monthlyRent: 2_800,
      isTorontoMunicipalLTT: true,
      isFirstTimeBuyer: false,
      homeAppreciationPct: 0.045,
      holdingPeriodYears: 25,
    },
  },
  vancouver: {
    label: 'Vancouver',
    overrides: {
      province: 'BC',
      homePrice: 1_300_000,
      monthlyRent: 3_200,
      homeAppreciationPct: 0.045,
      holdingPeriodYears: 25,
    },
  },
  calgary: {
    label: 'Calgary',
    overrides: {
      province: 'AB',
      homePrice: 620_000,
      monthlyRent: 2_200,
      homeAppreciationPct: 0.035,
      holdingPeriodYears: 25,
    },
  },
  ottawa: {
    label: 'Ottawa',
    overrides: {
      province: 'ON',
      homePrice: 680_000,
      monthlyRent: 2_200,
      homeAppreciationPct: 0.03,
      holdingPeriodYears: 25,
    },
  },
  montreal: {
    label: 'Montreal',
    overrides: {
      province: 'QC',
      homePrice: 600_000,
      monthlyRent: 1_900,
      homeAppreciationPct: 0.03,
      holdingPeriodYears: 25,
    },
  },
  edmonton: {
    label: 'Edmonton',
    overrides: {
      province: 'AB',
      homePrice: 460_000,
      monthlyRent: 1_800,
      homeAppreciationPct: 0.025,
      holdingPeriodYears: 25,
    },
  },
};

export async function generateStaticParams() {
  return (Object.keys(CITIES) as CityKey[]).map(city => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!Object.hasOwn(CITIES, city)) return {};
  const cfg = CITIES[city as CityKey];
  return {
    title: `${cfg.label} Rent vs Buy — longrun.ca`,
    description: `Rent vs buy in ${cfg.label}, Canada. 25-year wealth comparison using current median home prices and rents.`,
  };
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
}

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
};

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!Object.hasOwn(CITIES, city)) notFound();

  const cfg = CITIES[city as CityKey];
  const baseInputs = defaultInputsFor(cfg.overrides.province ?? 'ON');
  const inputs: CalculatorInputs = { ...baseInputs, ...cfg.overrides };
  const result = simulate(inputs);

  let cumMoveCost = 0;
  const ownerData = [
    { year: 0, value: inputs.homePrice * inputs.downPaymentPct },
    ...result.yearByYear.map(y => {
      cumMoveCost += y.ownerMoveTransactionCost;
      return { year: y.year, value: y.ownerEquity + y.ownerPortfolioEnd - cumMoveCost };
    }),
  ];
  const renterData = [
    { year: 0, value: result.yearByYear[0]?.renterPortfolioStart ?? 0 },
    ...result.yearByYear.map(y => ({ year: y.year, value: y.renterPortfolioEnd + y.renterRrspBalance })),
  ];

  const advantage = result.exit.netAdvantageToOwner;
  const winner = advantage > 500 ? 'buy' : advantage < -500 ? 'rent' : 'tie';
  const winnerColor = winner === 'buy' ? 'var(--color-owner)' : winner === 'rent' ? 'var(--color-renter)' : 'var(--color-text-muted)';
  const verdictLine = winner === 'buy' ? 'Buying comes out ahead' : winner === 'rent' ? 'Renting comes out ahead' : 'Roughly tied';
  const deltaLine = winner === 'tie'
    ? `Within ${fmt(Math.abs(advantage))} either way`
    : `${fmt(Math.abs(advantage))} ahead after ${inputs.holdingPeriodYears} years`;

  const allCities = Object.entries(CITIES) as [CityKey, CityConfig][];

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--color-outline)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--color-bg)',
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--color-text)', textDecoration: 'none' }}
        >
          longrun.ca
        </Link>
        <Link
          href="/experience"
          style={{
            height: '34px',
            padding: '0 16px',
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Run your numbers →
        </Link>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Eyebrow + headline */}
        <header style={{ paddingTop: '52px', paddingBottom: '44px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '16px' }}>
            25-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(28px, 5vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: winnerColor,
              marginBottom: '12px',
            }}
          >
            {cfg.label}: {verdictLine}
          </h1>
          <p
            style={{
              fontSize: 'clamp(18px, 3vw, 30px)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: 'var(--color-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deltaLine}
          </p>
        </header>

        {/* Key numbers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            marginBottom: '36px',
          }}
        >
          {[
            { label: 'Median home price', value: fmt(inputs.homePrice) },
            { label: 'Median monthly rent', value: `${fmt(inputs.monthlyRent)}/mo` },
            { label: 'Home appreciation', value: `${((inputs.homeAppreciationPct ?? 0.03) * 100).toFixed(1)}%/yr` },
            { label: 'Down payment', value: `${Math.round((inputs.downPaymentPct ?? 0.2) * 100)}%` },
          ].map(item => (
            <div
              key={item.label}
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-outline)',
                borderRadius: '12px',
                padding: '16px 18px',
              }}
            >
              <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {item.label}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Chart — client component */}
        <CityChart
          ownerData={ownerData}
          renterData={renterData}
          breakEvenYear={result.breakEvenYear}
          holdingPeriodYears={inputs.holdingPeriodYears}
        />

        {/* Chart legend */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--color-owner)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Owner — equity + portfolio</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--color-renter)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Renter — invested difference</span>
          </div>
        </div>

        {/* Assumptions note */}
        <div
          style={{
            marginTop: '28px',
            padding: '16px 20px',
            backgroundColor: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-outline)',
            borderRadius: '10px',
          }}
        >
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
            Inputs: {fmt(inputs.homePrice)} home, {Math.round((inputs.downPaymentPct ?? 0.2) * 100)}% down,{' '}
            {((inputs.mortgageRatePct ?? 0.05) * 100).toFixed(2)}% mortgage rate, 25-year amortization,{' '}
            {fmt(inputs.monthlyRent)}/mo rent, {((inputs.investmentReturnPct ?? 0.07) * 100).toFixed(1)}% investment return.{' '}
            These are illustrative provincial medians, not a prediction.{' '}
            <Link href="/experience" style={{ color: 'var(--color-text)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Enter your own numbers.
            </Link>
          </p>
        </div>

        {/* City switcher */}
        <div style={{ marginTop: '44px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '14px' }}>
            Compare other cities
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allCities.map(([key, c]) => {
              const isActive = key === city;
              return (
                <Link
                  key={key}
                  href={`/compare/${key}`}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: isActive ? 500 : 400,
                    border: `1px solid ${isActive ? 'var(--color-text)' : 'var(--color-outline)'}`,
                    backgroundColor: isActive ? 'var(--color-text)' : 'transparent',
                    color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)',
                    textDecoration: 'none',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: '48px',
            paddingTop: '32px',
            borderTop: '1px solid var(--color-outline)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(20px, 3.5vw, 32px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
              color: 'var(--color-text)',
            }}
          >
            These are medians. Your situation is different.
          </p>
          <Link
            href="/experience"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '52px',
              padding: '0 28px',
              backgroundColor: 'var(--color-btn-primary-bg)',
              color: 'var(--color-btn-primary-text)',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Run with your actual numbers →
          </Link>
        </div>

        <footer
          style={{
            marginTop: '32px',
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" style={{ fontSize: '12px', color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Home
          </Link>
          <Link href="/methodology" style={{ fontSize: '12px', color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Methodology
          </Link>
          <Link href="/faq" style={{ fontSize: '12px', color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            FAQ
          </Link>
          <span style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>Not financial advice.</span>
        </footer>
      </div>
    </div>
  );
}
