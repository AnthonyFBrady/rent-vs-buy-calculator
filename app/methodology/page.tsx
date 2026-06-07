import Link from 'next/link';
import { CITATIONS } from '@/engine';

export const metadata = {
  title: 'Methodology — Rent vs Buy Calculator',
  description:
    'The framework, formulas, and academic citations behind this calculator.',
};

export default function MethodologyPage() {
  return (
    <main id="main-content" className="min-h-screen pb-24">
      <div className="container-narrow">
        <header className="pt-12 pb-8 border-b border-ink/10">
          <p className="text-xs uppercase tracking-widest text-ink/60">
            Methodology
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl mt-2">
            How this calculator thinks
          </h1>
          <p className="mt-4 text-ink/70 max-w-xl">
            Every assumption is editable. Every claim has a paper behind it.
            Below is the math the calculator runs, and the research it stands
            on.
          </p>
        </header>

        <section className="py-8 border-b border-ink/10">
          <h2 className="font-serif text-2xl">The 5% Rule</h2>
          <p className="mt-3 text-ink/80">
            Ben Felix&apos;s 5% Rule says the annual unrecoverable cost of
            owning a home is roughly 5% of the home price. Decomposed:
          </p>
          <ul className="mt-3 ml-5 list-disc text-ink/80 space-y-1">
            <li>
              <strong>1% property tax</strong> (varies 0.3-1.25% by Canadian
              jurisdiction).
            </li>
            <li>
              <strong>1% maintenance</strong> (Felix&apos;s own research
              suggests real-world costs are closer to 1.5-2.5%. We default to
              1.5% and let you adjust).
            </li>
            <li>
              <strong>3% cost of capital</strong> (the spread between expected
              equity returns of about 4% real and expected residential returns
              of about 1% real, per Eichholtz et al. 2021).
            </li>
          </ul>
          <p className="mt-3 text-ink/80">
            If comparable monthly rent is below 5% of the home price divided
            by 12, renting is financially favored. If rent is above that,
            buying is favored.
          </p>
        </section>

        <section className="py-8 border-b border-ink/10">
          <h2 className="font-serif text-2xl">Year-by-year wealth comparison</h2>
          <p className="mt-3 text-ink/80">
            Beneath the 5% Rule, the calculator runs a full simulation
            comparing two paths over your holding period.
          </p>

          <h3 className="mt-6 font-serif text-lg">Owner path</h3>
          <ul className="mt-2 ml-5 list-disc text-ink/80 space-y-1 text-sm">
            <li>
              Year 0: down payment, land transfer tax (provincial + Toronto
              MLTT if applicable), legal fees, and CMHC premium for down
              payments below 20%.
            </li>
            <li>
              Each year: mortgage P+I (Canadian semi-annual compounding),
              property tax, maintenance, home insurance.
            </li>
            <li>
              Home value appreciates annually. Equity = home value minus
              mortgage balance.
            </li>
            <li>
              Exit: sell at current home value, pay realtor commission and
              legal, repay remaining mortgage. The Principal Residence
              Exemption means no capital gains tax.
            </li>
          </ul>

          <h3 className="mt-6 font-serif text-lg">Renter path</h3>
          <ul className="mt-2 ml-5 list-disc text-ink/80 space-y-1 text-sm">
            <li>
              Year 0: invest the amount the owner would have paid in closing
              costs as a starting portfolio.
            </li>
            <li>
              Each year: pay rent and renter&apos;s insurance, then invest the
              positive difference between the owner&apos;s annual cash-out and
              the renter&apos;s. Apply the savings-discipline factor to
              account for how much of the difference is actually invested
              versus consumed.
            </li>
            <li>
              Portfolio compounds at (expected return minus investment fees).
            </li>
            <li>
              Exit: liquidate. Capital gains tax applies at 50% inclusion at
              your marginal rate.
            </li>
          </ul>
        </section>

        <section className="py-8 border-b border-ink/10">
          <h2 className="font-serif text-2xl">PWL 2005-2024 baseline parameters</h2>
          <p className="mt-3 text-ink/80">
            PWL Capital&apos;s 20-year Canadian backtest (Rational Reminder
            episode 323, September 2025) used the following parameters. The
            calculator ships them as the &quot;PWL 2005-2024 baseline&quot; preset
            in the advanced section.
          </p>
          <ul className="mt-3 ml-5 list-disc text-ink/80 space-y-1 text-sm">
            <li>Down payment: 20%. Amortization: 25 years. Mortgage rate: Bank of Canada 5-year fixed.</li>
            <li>Maintenance: 2.5% of property value annually.</li>
            <li>Investment fees: 0.25% baseline (low-cost ETF), 1.76% historical-average sensitivity.</li>
            <li>Investment return: 8.19% nominal (30% Canadian / 70% global index).</li>
            <li>Savings discipline: 100% baseline. 90% and 80% sensitivities.</li>
            <li>Transaction costs: 2% closing, 6% selling.</li>
            <li>Holding period: 20 years.</li>
          </ul>
          <p className="mt-3 text-ink/80 text-sm">
            <strong>Headline result:</strong> Renters won 7 of 12 Canadian
            cities in the baseline case (Montreal, Ottawa, Winnipeg, Quebec
            City, Hamilton, Kitchener, Victoria). Owners won 5 of 12
            (Toronto, Vancouver, Calgary, Edmonton, Waterloo). At 1.76% fees
            or 80% savings discipline, the result flipped to 10 of 12
            owners winning.
          </p>
        </section>

        <section className="py-8 border-b border-ink/10">
          <h2 className="font-serif text-2xl">Canadian specifics built in</h2>
          <ul className="mt-3 ml-5 list-disc text-ink/80 space-y-1">
            <li>
              <strong>Mortgage math:</strong> Canadian semi-annual compounding
              (Interest Act). Effective monthly rate is{' '}
              <code>(1 + annualRate / 2)^(2/12) - 1</code>, not annualRate / 12.
            </li>
            <li>
              <strong>Land transfer tax:</strong> provincial brackets for
              every province, plus Toronto&apos;s Municipal LTT layered on
              when applicable. First-time-buyer rebates applied automatically.
            </li>
            <li>
              <strong>CMHC insurance:</strong> 4.0% / 3.1% / 2.8% premium
              schedule for 5% / 10% / 15% down. Homes above $1.5M ineligible.
            </li>
            <li>
              <strong>Capital gains:</strong> 50% inclusion at your marginal
              rate on the renter&apos;s portfolio gains at exit. Principal
              Residence Exemption applies to the owner&apos;s home gain.
            </li>
            <li>
              <strong>Mortgage interest:</strong> not deductible against
              employment income in Canada (key difference from US).
            </li>
          </ul>
        </section>

        <section className="py-8 border-b border-ink/10">
          <h2 className="font-serif text-2xl">What this calculator is not</h2>
          <ul className="mt-3 ml-5 list-disc text-ink/80 space-y-1">
            <li>Not financial advice.</li>
            <li>
              Not an endorsement by Ben Felix or PWL Capital. Inspired by his
              published framework, with citations to his papers.
            </li>
            <li>
              Not a real-estate listings tool. The product is the math and the
              explanation.
            </li>
            <li>
              Not a guarantee of future returns. Historical assumptions are
              illustrative.
            </li>
          </ul>
        </section>

        <section className="py-8">
          <h2 className="font-serif text-2xl">Citations</h2>
          <ol className="mt-4 space-y-6 text-sm">
            {CITATIONS.map((c) => (
              <li key={c.id} className="border-l-2 border-ink/10 pl-4">
                <p className="text-ink/90">
                  {c.authors} ({c.year}).{' '}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-ink/30 hover:decoration-ink/80"
                  >
                    {c.title}
                  </a>
                  . <em>{c.venue}</em>.
                </p>
                <p className="mt-2 text-ink/70 text-xs">
                  <strong>Key finding:</strong> {c.keyFinding}
                </p>
                <p className="mt-1 text-ink/70 text-xs">
                  <strong>Relevance:</strong> {c.relevance}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="pt-8 border-t border-ink/10 text-xs text-ink/50">
          <Link href="/" className="underline">
            ← Back to calculator
          </Link>
        </footer>
      </div>
    </main>
  );
}
