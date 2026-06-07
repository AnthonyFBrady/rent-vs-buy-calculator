'use client';

import type { CalculatorInputs, SimulationResult } from '@/engine';

interface Props {
  phase: number;
  inputs: CalculatorInputs;
  sim: SimulationResult;
}

const CHALK_BG = '#0E1C1A';
const CHALK_TEXT = 'rgba(244, 240, 230, 0.82)';
const CHALK_MUTED = 'rgba(244, 240, 230, 0.40)';
const CHALK_OWNER = 'rgba(232, 200, 122, 0.90)';
const CHALK_RENTER = 'rgba(108, 191, 184, 0.90)';

const fmt = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0' }}>
      <span style={{ fontSize: '11px', color: CHALK_MUTED }}>{label}</span>
      <span style={{ fontSize: '12px', fontFamily: 'var(--font-serif), Georgia, serif', color: color ?? CHALK_TEXT, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <p style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: CHALK_MUTED, marginBottom: '8px' }}>{label}</p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(244,240,230,0.10)', margin: '12px 0' }} />;
}

export function ChalkPanel({ phase, inputs, sim }: Props) {
  const loanAmount = inputs.homePrice * (1 - inputs.downPaymentPct);
  const yr1Interest = loanAmount * inputs.mortgageRatePct;
  const yr1Tax = inputs.propertyTaxPct * inputs.homePrice;
  const yr1Maintenance = (inputs.maintenancePct ?? 0.015) * inputs.homePrice;
  const yr1Insurance = (inputs.homeInsuranceMonthly ?? 150) * 12;
  const yr1Strata = (inputs.monthlyStrataFee ?? 0) * 12;
  const yr1Unrecoverable = yr1Interest + yr1Tax + yr1Maintenance + yr1Insurance + yr1Strata;
  const unrecoverablePct = inputs.homePrice > 0
    ? ((yr1Unrecoverable / inputs.homePrice) * 100).toFixed(1)
    : '0.0';

  const rentToPrice = inputs.homePrice > 0 ? (inputs.monthlyRent * 12) / inputs.homePrice : 0;
  const rtpPct = (rentToPrice * 100).toFixed(1);
  const rtpSignal = rentToPrice < 0.03 ? 'buy' : rentToPrice > 0.05 ? 'rent' : 'mid';

  const hasRentControl = inputs.rentControlCapPct != null && inputs.rentControlCapPct > 0;
  const capPct = inputs.rentControlCapPct != null ? (inputs.rentControlCapPct * 100).toFixed(1) : null;
  const tenYearGap = hasRentControl && inputs.rentControlCapPct != null
    ? Math.round((Math.pow(1 + inputs.rentEscalationPct, 10) / Math.pow(1 + inputs.rentControlCapPct, 10) - 1) * 100)
    : null;

  const ownerMoveCostEst = inputs.homePrice * 0.09;
  const monthlyGap = Math.max(0, (sim.yearByYear[0]?.cashOutDelta ?? 0) / 12);
  const actualMonthly = monthlyGap * inputs.savingsDisciplinePct;
  const disc = Math.round(inputs.savingsDisciplinePct * 100);

  const renewalRatePct = ((inputs.mortgageRenewalRatePct ?? inputs.mortgageRatePct) * 100).toFixed(2);
  const initialRatePct = (inputs.mortgageRatePct * 100).toFixed(2);

  const content: Record<number, React.ReactNode> = {
    1: (
      <>
        <Section label="How the model works">
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
            Both paths invest the same dollars differently. The owner builds equity. The renter invests what the owner spends.
          </p>
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED, marginTop: '10px' }}>
            The question: does owning a home beat a disciplined investment portfolio over the same time horizon?
          </p>
        </Section>
        <Divider />
        <Section label="Ben Felix framework">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED }}>
            Rational Reminder podcast. Every assumption in this calculator is sourced and editable. No financial advice is given or implied.
          </p>
        </Section>
      </>
    ),

    2: (
      <>
        <Section label="Why holding period matters">
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
            Transaction costs are 4–9% of the home value. It takes years of equity growth to recover them.
          </p>
        </Section>
        <Divider />
        <Section label="Rule of thumb">
          <Row label="Short horizon (< 5 yr)" value="Renting usually wins" color={CHALK_RENTER} />
          <Row label="Medium (5–15 yr)" value="Assumption-sensitive" color={CHALK_TEXT} />
          <Row label="Long horizon (15+ yr)" value="Buying often wins" color={CHALK_OWNER} />
        </Section>
      </>
    ),

    3: (
      <>
        <Section label="Land transfer tax in your province">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED }}>
            One-time cost paid at closing. Calculated on the full purchase price. First-time buyers qualify for a partial rebate in most provinces.
          </p>
          <Divider />
          <Row
            label={`LTT on ${fmt.format(inputs.homePrice)}`}
            value={fmt.format(sim.commitment.ownerStartingCashOut)}
            color={CHALK_OWNER}
          />
          <p style={{ fontSize: '10px', color: CHALK_MUTED, marginTop: '6px' }}>
            Includes LTT, legal fees, CMHC PST if applicable, and moving costs.
          </p>
        </Section>
      </>
    ),

    4: (
      <>
        <Section label="What the renter does instead">
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
            Whatever you put toward the down payment, the renter invests from day 1.
          </p>
          <Divider />
          <Row
            label="Renter starts with"
            value={fmt.format(sim.commitment.renterStartingLumpSum)}
            color={CHALK_RENTER}
          />
          <Row
            label="Owner year-0 cash out"
            value={fmt.format(sim.commitment.ownerStartingCashOut)}
            color={CHALK_OWNER}
          />
        </Section>
        <Divider />
        <Section label="Rule">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED }}>
            Larger down payment = deeper renter starting portfolio. The renter's advantage grows with the down payment size.
          </p>
        </Section>
      </>
    ),

    5: (
      <>
        <Section label={`Unrecoverable cost — ${unrecoverablePct}% of price per year`}>
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED, marginBottom: '10px' }}>
            Costs that build no equity, paid every year regardless of the market.
          </p>
          <Row label="Year-1 interest" value={fmt.format(Math.round(yr1Interest))} />
          <Row label="Property tax" value={fmt.format(Math.round(yr1Tax))} />
          <Row label="Maintenance" value={fmt.format(Math.round(yr1Maintenance))} />
          <Row label="Insurance" value={fmt.format(Math.round(yr1Insurance))} />
          {yr1Strata > 0 && <Row label="Strata fees" value={fmt.format(Math.round(yr1Strata))} />}
          <div style={{ height: '1px', background: CHALK_MUTED, opacity: 0.35, margin: '6px 0' }} />
          <Row label="Total unrecoverable" value={fmt.format(Math.round(yr1Unrecoverable))} color={CHALK_OWNER} />
        </Section>
      </>
    ),

    6: (
      <>
        {inputs.monthlyStrataFee && inputs.monthlyStrataFee > 0 ? (
          <Section label="Condo costs">
            <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
              Strata fees are an ongoing cost that escalates with inflation. They reduce the invest-the-difference surplus for the renter.
            </p>
            <Divider />
            <Row label="Monthly strata" value={fmt.format(inputs.monthlyStrataFee)} color={CHALK_OWNER} />
            <Row label="Annual cost" value={fmt.format(inputs.monthlyStrataFee * 12)} />
          </Section>
        ) : (
          <Section label="Maintenance assumption">
            <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
              The model uses {((inputs.maintenancePct ?? 0.015) * 100).toFixed(1)}% of home value per year for maintenance — replacing roofs, HVAC, appliances over time.
            </p>
            <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED, marginTop: '8px' }}>
              Most studies suggest 1–2% annually. Condos can be lower; older homes can be higher.
            </p>
          </Section>
        )}
      </>
    ),

    7: (
      <>
        <Section label="Rate impact">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED, marginBottom: '8px' }}>
            Year-1 interest at {initialRatePct}%
          </p>
          <Row label="Annual interest" value={fmt.format(Math.round(yr1Interest))} color={CHALK_OWNER} />
          <Row label="Monthly payment" value={fmt.format(Math.round((sim.yearByYear[0]?.ownerAnnualMortgagePayment ?? 0) / 12))} />
        </Section>
        <Divider />
        <Section label="Sensitivity">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED }}>
            A 1% higher rate adds roughly {fmt.format(Math.round(loanAmount * 0.01 / 12))}/mo to the payment. The chart updates as you drag.
          </p>
        </Section>
      </>
    ),

    8: (
      <>
        <Section label="Canadian renewal reality">
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
            5-year fixed terms renew at market rates. Your monthly payment is recalculated from the remaining balance.
          </p>
          <Divider />
          <Row label="Initial rate" value={`${initialRatePct}%`} color={CHALK_OWNER} />
          <Row label="Renewal rate" value={`${renewalRatePct}%`} color={parseFloat(renewalRatePct) > parseFloat(initialRatePct) ? CHALK_OWNER : CHALK_RENTER} />
          <Divider />
          <p style={{ fontSize: '10px', lineHeight: 1.6, color: CHALK_MUTED }}>
            Jun 2026 5yr fixed: ~4.2–4.8%. Stress test = contract rate + 2%. Historical avg since 1990: ~5.5%. A worst-case renewal at 6.5% is plausible.
          </p>
        </Section>
      </>
    ),

    9: (
      <>
        <Section label="Rent-to-price signal">
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: rtpSignal === 'buy' ? CHALK_OWNER : rtpSignal === 'rent' ? CHALK_RENTER : CHALK_TEXT }}>
            {rtpSignal === 'buy' && `Low at ${rtpPct}% — buying tends to win here.`}
            {rtpSignal === 'mid' && `Moderate at ${rtpPct}% — outcome is assumption-sensitive.`}
            {rtpSignal === 'rent' && `High at ${rtpPct}% — renting often wins here.`}
          </p>
          <p style={{ fontSize: '10px', color: CHALK_MUTED, marginTop: '6px' }}>Annual rent / home price. Ben Felix framework.</p>
        </Section>
        <Divider />
        <Section label="Thresholds">
          <Row label="Below 3%" value="Buying usually wins" color={CHALK_OWNER} />
          <Row label="3–5%" value="Depends on assumptions" />
          <Row label="Above 5%" value="Renting often wins" color={CHALK_RENTER} />
        </Section>
      </>
    ),

    10: (
      <>
        {hasRentControl ? (
          <Section label="Rent control benefit">
            <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
              In-place rent is capped at {capPct}%/yr. Market rent grows at {(inputs.rentEscalationPct * 100).toFixed(1)}%/yr.
            </p>
            {tenYearGap !== null && tenYearGap > 0 && (
              <>
                <Divider />
                <Row label="Discount after 10 yr" value={`~${tenYearGap}% below asking`} color={CHALK_RENTER} />
                <p style={{ fontSize: '10px', color: CHALK_MUTED, marginTop: '6px' }}>
                  CMHC data: Ontario long-term tenants pay 20–40% below market. Moving permanently resets this.
                </p>
              </>
            )}
          </Section>
        ) : (
          <Section label={`No rent control in ${inputs.province}`}>
            <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
              Rent resets to market on each renewal. Staying put gives no discount — moving is cheap but the math is the same.
            </p>
          </Section>
        )}
      </>
    ),

    11: (
      <>
        <Section label="The asymmetry">
          <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
            Owner moves cost 8–9% of the home value. Renter moves cost $400.
          </p>
          <Divider />
          <Row label="Owner move cost" value={fmt.format(Math.round(ownerMoveCostEst))} color={CHALK_OWNER} />
          <Row label="Renter move cost" value="$400" color={CHALK_RENTER} />
          <Divider />
          <p style={{ fontSize: '10px', lineHeight: 1.6, color: CHALK_MUTED }}>
            {hasRentControl
              ? 'Renter moves are cheap but each one gives up the rent-control discount permanently.'
              : `No rent control in ${inputs.province}. Both sides are free to move without a compounding cost.`}
          </p>
        </Section>
      </>
    ),

    12: (
      <>
        <Section label="Account priority">
          <Row label="1st" value="TFSA" color={CHALK_RENTER} />
          <Row label="2nd" value="FHSA ($8k/yr)" color={CHALK_RENTER} />
          <Row label="3rd" value="RRSP" color={CHALK_TEXT} />
          <Row label="Remainder" value="Taxable" color={CHALK_MUTED} />
        </Section>
        <Divider />
        <Section label="Exit tax treatment">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED }}>
            TFSA + FHSA: tax-free. RRSP: taxed as income at withdrawal. Taxable: 50% cap gains inclusion. FHSA contributions are tax-deductible — refund reinvested each year.
          </p>
        </Section>
      </>
    ),

    13: (
      <>
        {monthlyGap > 0 ? (
          <Section label="Invest the difference">
            <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
              {disc === 100
                ? `Renter invests the full ${fmt.format(Math.round(monthlyGap))}/mo housing advantage.`
                : disc === 0
                ? 'Renter invests nothing. Renting almost always loses this way.'
                : `Renter invests ${fmt.format(Math.round(actualMonthly))}/mo of a ${fmt.format(Math.round(monthlyGap))}/mo advantage.`}
            </p>
            <Divider />
            <Row label="Monthly cash advantage" value={`${fmt.format(Math.round(monthlyGap))}/mo`} color={CHALK_RENTER} />
            <Row label="Discipline" value={`${disc}%`} />
            <Row label="Invested" value={`${fmt.format(Math.round(actualMonthly))}/mo`} color={CHALK_RENTER} />
          </Section>
        ) : (
          <Section label="Invest the difference">
            <p style={{ fontSize: '12px', lineHeight: 1.65, color: CHALK_TEXT }}>
              Owner's monthly costs are currently lower. The owner invests the surplus at the discipline rate.
            </p>
          </Section>
        )}
        <Divider />
        <Section label="The key finding">
          <p style={{ fontSize: '11px', lineHeight: 1.6, color: CHALK_MUTED }}>
            If the renter does not invest the difference, renting almost always loses. Savings discipline is the most load-bearing assumption in this model.
          </p>
        </Section>
      </>
    ),
  };

  const node = content[phase];
  if (!node) return null;

  return (
    <div
      className="hidden md:flex flex-col"
      style={{
        width: '272px',
        flexShrink: 0,
        backgroundColor: CHALK_BG,
        borderLeft: '1px solid rgba(244,240,230,0.07)',
        padding: '20px 18px',
        overflow: 'hidden',
      }}
    >
      {node}
    </div>
  );
}
