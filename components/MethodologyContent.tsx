import { CITATIONS } from '@/engine';

const SECTION_STYLE: React.CSSProperties = {
  paddingTop: '36px',
  paddingBottom: '36px',
  borderBottom: '1px solid var(--color-outline)',
};

const H2_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif), Georgia, serif',
  fontSize: 'clamp(18px, 3vw, 24px)',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  color: 'var(--color-text)',
  marginBottom: '16px',
};

const H3_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif), Georgia, serif',
  fontSize: '16px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--color-text)',
  marginTop: '24px',
  marginBottom: '10px',
};

const BODY_STYLE: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--color-text-muted)',
  lineHeight: 1.7,
  letterSpacing: '-0.005em',
  fontFamily: 'var(--font-sans), system-ui, sans-serif',
};

const LI_STYLE: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--color-text-muted)',
  lineHeight: 1.7,
  paddingLeft: '4px',
  fontFamily: 'var(--font-sans), system-ui, sans-serif',
};

export function MethodologyContent() {
  return (
    <div style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>

      {/* 5% Rule */}
      <section style={SECTION_STYLE}>
        <h2 style={H2_STYLE}>The 5% Rule</h2>
        <p style={BODY_STYLE}>
          Ben Felix's 5% Rule holds that the annual unrecoverable cost of owning a home is roughly
          5% of the home price. It breaks into three components:
        </p>
        <ul style={{ marginTop: '16px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'disc' }}>
          <li style={LI_STYLE}>
            <strong style={{ color: 'var(--color-text)' }}>1% property tax</strong> — varies 0.3%
            to 1.25% by Canadian jurisdiction. We use the provincial median and let you adjust.
          </li>
          <li style={LI_STYLE}>
            <strong style={{ color: 'var(--color-text)' }}>1% maintenance</strong> — Felix's own
            research suggests 1.5–2.5% in practice. We default to 1.5% (adjustable).
          </li>
          <li style={LI_STYLE}>
            <strong style={{ color: 'var(--color-text)' }}>3% cost of capital</strong> — the spread
            between expected equity returns (~4% real) and expected residential returns (~1% real),
            per Eichholtz et al. 2021.
          </li>
        </ul>
        <p style={{ ...BODY_STYLE, marginTop: '16px' }}>
          If comparable monthly rent is below 5% of the home price divided by 12, renting is
          financially favored. The calculator runs the full year-by-year simulation on top of this
          heuristic.
        </p>
      </section>

      {/* Year-by-year simulation */}
      <section style={SECTION_STYLE}>
        <h2 style={H2_STYLE}>Year-by-year wealth comparison</h2>
        <p style={BODY_STYLE}>
          Beneath the 5% heuristic, the calculator runs a full simulation comparing two paths over
          your holding period.
        </p>

        <h3 style={H3_STYLE}>Owner path</h3>
        <ul style={{ marginTop: '8px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'disc' }}>
          <li style={LI_STYLE}>Year 0: down payment, land transfer tax (provincial + Toronto MLTT), legal fees, and CMHC premium for down payments below 20%.</li>
          <li style={LI_STYLE}>Each year: mortgage P+I (Canadian semi-annual compounding), property tax, maintenance, home insurance, and any strata fees.</li>
          <li style={LI_STYLE}>Home value appreciates annually. Equity = home value minus mortgage balance.</li>
          <li style={LI_STYLE}>If annual cash-out is less than the renter's, the owner invests the surplus at the investment return rate.</li>
          <li style={LI_STYLE}>Exit: sell at current home value, pay realtor commission and legal fees, repay remaining mortgage. The Principal Residence Exemption means no capital gains tax.</li>
        </ul>

        <h3 style={H3_STYLE}>Renter path</h3>
        <ul style={{ marginTop: '8px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'disc' }}>
          <li style={LI_STYLE}>Year 0: invest the owner's full year-0 cash-out (down payment + land transfer tax + legal fees + CMHC premium PST + owner moving cost) minus the renter's first+last deposit and moving cost. This captures the opportunity cost of every dollar the owner deploys at closing.</li>
          <li style={LI_STYLE}>Each year: pay rent and renter's insurance, then invest the positive difference between the owner's full annual cash-out (including property tax and maintenance) and the renter's. Property tax is treated as a compounding investable difference, not a nominal deduction from owner wealth.</li>
          <li style={LI_STYLE}>A savings-discipline factor (default 100%) accounts for how much of the difference is actually invested rather than consumed.</li>
          <li style={LI_STYLE}>Portfolio compounds at (expected return minus investment fees). TFSA, FHSA, and RRSP shelters apply if enabled.</li>
          <li style={LI_STYLE}>Exit: liquidate the portfolio. Capital gains tax applies at 50% inclusion at your marginal rate.</li>
        </ul>

        <h3 style={H3_STYLE}>Rental suite income</h3>
        <p style={BODY_STYLE}>
          If you rent a basement suite or secondary unit, the net monthly income reduces the
          owner's effective annual cash-out. This shifts the invest-the-difference calculation in
          the owner's favor. The suite income grows at the same annual rate as rent.
        </p>
      </section>

      {/* Canadian specifics */}
      <section style={SECTION_STYLE}>
        <h2 style={H2_STYLE}>Canadian specifics built in</h2>
        <ul style={{ marginTop: '8px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'disc' }}>
          <li style={LI_STYLE}>
            <strong style={{ color: 'var(--color-text)' }}>Mortgage math:</strong> Canadian
            semi-annual compounding (Interest Act). Effective monthly rate is{' '}
            <code style={{ fontSize: '12px', color: 'var(--color-text)', backgroundColor: 'var(--color-bg-subtle)', padding: '1px 4px', borderRadius: '3px' }}>
              (1 + annualRate / 2)^(1/6) - 1
            </code>
            , not annualRate / 12.
          </li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>Land transfer tax:</strong> provincial brackets for every province, plus Toronto's Municipal LTT layered on when applicable. First-time-buyer rebates applied automatically.</li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>CMHC insurance:</strong> 4.0% / 3.1% / 2.8% premium schedule for 5% / 10% / 15% down payments. Homes above $1.5M are not CMHC-eligible.</li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>Capital gains:</strong> 50% inclusion at your marginal rate on the renter's portfolio gains at exit. The Principal Residence Exemption covers the owner's home gain.</li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>Mortgage interest:</strong> not deductible against employment income in Canada — a key difference from the US model.</li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>TFSA:</strong> $7,000/yr new room. Tax-free growth, no capital gains tax at exit.</li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>FHSA:</strong> $8,000/yr tax-deductible, tax-free growth. Up to $40,000 lifetime. First-time buyers only.</li>
          <li style={LI_STYLE}><strong style={{ color: 'var(--color-text)' }}>RRSP:</strong> 18% of earned income per year, max $31,560. Deferred tax at withdrawal. Refunds reinvested.</li>
        </ul>
      </section>

      {/* PWL baseline */}
      <section style={SECTION_STYLE}>
        <h2 style={H2_STYLE}>PWL 2005–2024 baseline parameters</h2>
        <p style={BODY_STYLE}>
          PWL Capital's 20-year Canadian backtest (Rational Reminder episode 323, September 2025) used the following parameters:
        </p>
        <ul style={{ marginTop: '16px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'disc' }}>
          <li style={LI_STYLE}>Down payment: 20%. Amortization: 25 years. Mortgage rate: Bank of Canada 5-year fixed.</li>
          <li style={LI_STYLE}>Maintenance: 2.5% of property value annually.</li>
          <li style={LI_STYLE}>Investment fees: 0.25% baseline (low-cost ETF); 1.76% historical-average sensitivity.</li>
          <li style={LI_STYLE}>Investment return: 8.19% nominal (30% Canadian / 70% global index).</li>
          <li style={LI_STYLE}>Savings discipline: 100% baseline. 90% and 80% sensitivities.</li>
          <li style={LI_STYLE}>Transaction costs: 2% closing, 6% selling.</li>
          <li style={LI_STYLE}>Holding period: 20 years.</li>
        </ul>
        <div style={{ marginTop: '20px', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-outline)', borderRadius: '10px', padding: '16px 20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.65, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
            <strong style={{ color: 'var(--color-text)' }}>Headline result:</strong> Renters won 7 of 12 Canadian cities in the baseline case (Montreal, Ottawa, Winnipeg, Quebec City, Hamilton, Kitchener, Victoria). Owners won 5 of 12 (Toronto, Vancouver, Calgary, Edmonton, Waterloo). At 1.76% fees or 80% savings discipline, the result flipped to 10 of 12 cities favoring the owner.
          </p>
        </div>
      </section>

      {/* What this is not */}
      <section style={SECTION_STYLE}>
        <h2 style={H2_STYLE}>What this calculator is not</h2>
        <ul style={{ marginTop: '8px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'disc' }}>
          <li style={LI_STYLE}>Not financial advice.</li>
          <li style={LI_STYLE}>Not endorsed by Ben Felix or PWL Capital. Inspired by published research, with citations.</li>
          <li style={LI_STYLE}>Not a real-estate listings tool. The product is the math and the explanation.</li>
          <li style={LI_STYLE}>Not a guarantee of future returns. All assumptions are illustrative.</li>
        </ul>
      </section>

      {/* Citations */}
      <section style={{ paddingTop: '36px', paddingBottom: '36px' }}>
        <h2 style={H2_STYLE}>Citations</h2>
        <ol style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '0', listStyle: 'none' }}>
          {CITATIONS.map((c, i) => (
            <li key={c.id} style={{ borderLeft: '2px solid var(--color-outline)', paddingLeft: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: '6px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                <span style={{ color: 'var(--color-text-faint)', marginRight: '6px' }}>{i + 1}.</span>
                {c.authors} ({c.year}).{' '}
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text)', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline-active)' }}>
                    {c.title}
                  </a>
                ) : (
                  <em>{c.title}</em>
                )}
                {'. '}<em style={{ color: 'var(--color-text-muted)' }}>{c.venue}</em>.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '3px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                <strong style={{ color: 'var(--color-text-faint)' }}>Key finding:</strong> {c.keyFinding}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                <strong style={{ color: 'var(--color-text-faint)' }}>Relevance:</strong> {c.relevance}
              </p>
            </li>
          ))}
        </ol>
      </section>

    </div>
  );
}
