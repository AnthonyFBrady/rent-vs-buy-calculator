import Link from 'next/link';

export const metadata = {
  title: 'longrun.ca — Rent vs Buy Calculator for Canada',
  description:
    'The most transparent rent vs buy calculator for Canada. Evidence-based math, every assumption editable, built on the Ben Felix framework.',
};

const STEPS = [
  {
    n: '01',
    heading: 'Answer 7 questions',
    body: 'Province, home price, down payment, mortgage rate, rent, time horizon, and your financial situation. Smart defaults fill in everything else.',
  },
  {
    n: '02',
    heading: 'See two futures',
    body: 'Owner wealth (equity + portfolio) vs. renter wealth (invested difference) tracked year by year. One animated chart.',
  },
  {
    n: '03',
    heading: 'Know your number',
    body: 'A net dollar advantage, a break-even year, and five sensitivity scenarios. Share it, or open any assumption and change it.',
  },
];

export default function LandingPage() {
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
        <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.02em' }}>
          longrun.ca
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link
            href="/methodology"
            style={{ fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', letterSpacing: '-0.01em' }}
          >
            Methodology
          </Link>
          <Link
            href="/faq"
            style={{ fontSize: '13px', color: 'var(--color-text-muted)', textDecoration: 'none', letterSpacing: '-0.01em' }}
          >
            FAQ
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
            Calculator →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '80px 24px 64px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-faint)',
            marginBottom: '24px',
          }}
        >
          Canada's evidence-based rent vs buy calculator
        </p>
        <h1
          style={{
            fontSize: 'clamp(36px, 6.5vw, 64px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: 'var(--color-text)',
            marginBottom: '24px',
            fontFamily: 'var(--font-serif), Georgia, serif',
          }}
        >
          Two futures.
          <br />
          Same starting money.
        </h1>
        <p
          style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            maxWidth: '540px',
            marginBottom: '40px',
            letterSpacing: '-0.01em',
          }}
        >
          One decision can shift your net worth by hundreds of thousands.
          See the math — every assumption editable, every formula cited.
        </p>
        <Link
          href="/experience"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '56px',
            padding: '0 32px',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            borderRadius: '9999px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          See your number →
        </Link>
        <p
          style={{
            marginTop: '16px',
            fontSize: '12px',
            color: 'var(--color-text-faint)',
          }}
        >
          Free. No account. Takes 3 minutes.
        </p>
      </section>

      {/* Illustrative chart */}
      <section
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-chart-bg)',
            borderRadius: '16px',
            padding: '32px 28px 28px',
            border: '1px solid var(--color-outline)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-chart-axis)',
              marginBottom: '20px',
            }}
          >
            Example — Toronto, $1.05M condo, 20% down, 25 years
          </p>
          <StaticWealthChart />
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--color-chart-axis)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '2.5px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-owner)',
                }}
              />
              Owner
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--color-chart-axis)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '2.5px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--color-renter)',
                }}
              />
              Renter (investing the difference)
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-faint)',
            marginBottom: '40px',
          }}
        >
          How it works
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
          }}
        >
          {STEPS.map((s) => (
            <div key={s.n}>
              <p
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                  color: 'var(--color-outline)',
                  marginBottom: '14px',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.n}
              </p>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                }}
              >
                {s.heading}
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology teaser */}
      <section
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-outline)',
            borderRadius: '16px',
            padding: '40px 36px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
              marginBottom: '20px',
            }}
          >
            Built on evidence
          </p>
          <blockquote
            style={{
              fontSize: 'clamp(17px, 2.5vw, 22px)',
              fontWeight: 500,
              letterSpacing: '-0.025em',
              lineHeight: 1.45,
              color: 'var(--color-text)',
              marginBottom: '24px',
            }}
          >
            "The annual unrecoverable cost of owning is roughly 5% of the home
            price. If you can rent an equivalent home for less than that, the
            financial decision is clear."
          </blockquote>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-text-faint)',
              marginBottom: '24px',
            }}
          >
            Inspired by Ben Felix and PWL Capital research. Canadian specifics
            built in: LTT, CMHC, PRE, capital gains, TFSA/FHSA/RRSP.
          </p>
          <Link
            href="/methodology"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              textDecorationColor: 'var(--color-outline)',
              letterSpacing: '-0.01em',
            }}
          >
            Read the full methodology →
          </Link>
        </div>
      </section>

      {/* CTA repeat */}
      <section
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '0 24px 80px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            marginBottom: '20px',
            lineHeight: 1.1,
          }}
        >
          Know your number.
        </h2>
        <Link
          href="/experience"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '56px',
            padding: '0 36px',
            backgroundColor: 'var(--color-btn-primary-bg)',
            color: 'var(--color-btn-primary-text)',
            borderRadius: '9999px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          Start the calculator →
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-outline)',
          padding: '24px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          maxWidth: '760px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/methodology" style={{ fontSize: '12px', color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Methodology
          </Link>
          <Link href="/faq" style={{ fontSize: '12px', color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            FAQ
          </Link>
          <Link href="/experience" style={{ fontSize: '12px', color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Calculator
          </Link>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-faint)' }}>
          Not financial advice. Every assumption is editable.
        </p>
      </footer>
    </div>
  );
}

function StaticWealthChart() {
  const W = 700;
  const H = 200;
  const PAD = { t: 10, r: 70, b: 28, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  // Approximate Toronto data: years 0-25, wealth 0-1.5M
  const scX = (yr: number) => PAD.l + (yr / 25) * iW;
  const scY = (val: number) => PAD.t + iH - (val / 1_500_000) * iH;

  const ownerPts: [number, number][] = [
    [0, 210000], [3, 238000], [6, 300000], [9, 400000], [12, 530000],
    [15, 700000], [18, 920000], [21, 1150000], [25, 1400000],
  ];
  const renterPts: [number, number][] = [
    [0, 168000], [3, 230000], [6, 310000], [9, 410000], [12, 520000],
    [15, 630000], [18, 740000], [21, 840000], [25, 950000],
  ];

  const toPolyline = (pts: [number, number][]) =>
    pts.map(([yr, v]) => `${scX(yr).toFixed(1)},${scY(v).toFixed(1)}`).join(' ');

  const yTicks = [0, 500000, 1000000, 1500000];
  const xTicks = [0, 5, 10, 15, 20, 25];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="Illustrative wealth chart showing owner and renter trajectories over 25 years"
    >
      {/* Grid */}
      {yTicks.map(v => (
        <g key={v}>
          <line
            x1={PAD.l} y1={scY(v)} x2={PAD.l + iW} y2={scY(v)}
            stroke="var(--color-chart-grid)" strokeWidth={1}
          />
          <text
            x={PAD.l - 6} y={scY(v)} dy="0.32em"
            textAnchor="end" fontSize={9} fill="var(--color-chart-axis)"
            fontFamily="var(--font-sans), system-ui, sans-serif"
          >
            {v === 0 ? '$0' : v >= 1_000_000 ? `$${v / 1_000_000}M` : `$${v / 1000}k`}
          </text>
        </g>
      ))}
      {xTicks.map(yr => (
        <g key={yr} transform={`translate(${scX(yr)},${PAD.t + iH})`}>
          <line y2={4} stroke="var(--color-chart-axis)" strokeWidth={1} />
          <text y={14} textAnchor="middle" fontSize={9}
            fill="var(--color-chart-axis)"
            fontFamily="var(--font-sans), system-ui, sans-serif">
            {yr === 0 ? 'Now' : `Yr ${yr}`}
          </text>
        </g>
      ))}

      {/* Area fills */}
      <defs>
        <linearGradient id="lp-owner-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-owner)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="var(--color-owner)" stopOpacity={0.01} />
        </linearGradient>
        <linearGradient id="lp-renter-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-renter)" stopOpacity={0.16} />
          <stop offset="100%" stopColor="var(--color-renter)" stopOpacity={0.01} />
        </linearGradient>
      </defs>

      {/* Lines */}
      <polyline
        points={toPolyline(ownerPts)}
        fill="none"
        stroke="var(--color-owner)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={toPolyline(renterPts)}
        fill="none"
        stroke="var(--color-renter)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End labels */}
      <text
        x={scX(25) + 8} y={scY(1400000)} dy="0.32em"
        fontSize={10} fontWeight={600} fill="var(--color-owner)"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        $1.40M
      </text>
      <text
        x={scX(25) + 8} y={scY(950000)} dy="0.32em"
        fontSize={10} fontWeight={600} fill="var(--color-renter)"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        $950k
      </text>
    </svg>
  );
}
