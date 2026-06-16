'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why does this product exist?',
    a: "The explicit costs of renting are obvious to everyone: the deposit, the monthly cheque, the landlord who can raise your rent next year. The implicit costs of owning are invisible until you run the math: land transfer tax, CMHC insurance, property tax, maintenance, and the opportunity cost of locking $143,000 in a down payment instead of letting it compound in your portfolio. Most mortgage calculators tell you what your payment will be, not what your net worth will be. reckon shows both sides, makes every assumption editable, and cites every formula. The goal is not to tell you what to do. It is to make the real math visible so you can decide.",
  },
  {
    q: 'Why does renting look better in this calculator?',
    a: "Renting frees up capital. When you rent, you invest the amount you would have put toward a down payment and closing costs, plus the annual cash-flow savings. That invested capital compounds over time. Whether buying or renting comes out ahead depends on home appreciation vs. investment returns, your time horizon, and transaction costs. The calculator shows you the actual numbers for your situation — it doesn't start with a conclusion.",
  },
  {
    q: 'What is the 5% rule?',
    a: "Ben Felix's 5% rule says the annual unrecoverable cost of owning a home is roughly 5% of the home price: 1% property tax, 1% maintenance, and 3% cost of capital. If comparable monthly rent is below 5% of the home price divided by 12, renting is financially favored. If rent is above that threshold, buying is favored. The rule is a heuristic. The calculator runs a full year-by-year simulation on top of it.",
  },
  {
    q: 'What is opportunity cost?',
    a: 'Opportunity cost is what you give up by choosing one path over another. When you buy, the down payment and closing costs can no longer be invested in the market. When you rent, you invest that capital instead. The gap between what the owner earns on home equity and what the renter earns on invested capital is the opportunity cost of the down payment.',
  },
  {
    q: 'Does this model rent control?',
    a: "Yes. Ontario defaults to a 2.5% annual rent escalation cap (the provincial guideline). Quebec defaults to 3%. Other provinces have no statutory cap, so rent tracks market inflation. You can override the cap for any province. If the renter moves during the holding period, rent resets to market, bypassing the cap.",
  },
  {
    q: 'What is CMHC mortgage insurance?',
    a: "CMHC (Canada Mortgage and Housing Corporation) insures mortgages where the down payment is below 20%. The premium is 4.0% of the mortgage amount for 5% down, 3.1% for 10% down, and 2.8% for 15% down. This premium is added to the mortgage balance at closing, which is why it inflates the total interest cost. Homes above $1.5M are not eligible for CMHC insurance, so you need at least 20% down.",
  },
  {
    q: 'How does a rental suite reduce the cost of owning?',
    a: "If you rent out a basement suite or secondary unit, the net monthly income reduces your effective annual housing cash-out. This shrinks the gap that the renter would otherwise invest. Over 25 years, $1,500/mo in suite income can shift the comparison by hundreds of thousands of dollars because the renter's annual invest-the-difference is reduced. Enable this in the 'Tell me about yourself' step under the Advanced section.",
  },
  {
    q: 'How is Canadian mortgage math different from American?',
    a: "Canadian mortgages compound semi-annually by law (the Interest Act). This means the effective monthly interest rate is (1 + annualRate / 2)^(1/6) - 1, not annualRate / 12. For a 5% mortgage, the difference is small but meaningful over 25 years. Also, mortgage interest is not tax-deductible against employment income in Canada, unlike in the US.",
  },
  {
    q: 'What is land transfer tax?',
    a: "Land transfer tax (LTT) is a provincial tax paid at closing when you buy a home. Every province has its own rate schedule with brackets. Ontario's top bracket is 2.0% on amounts above $400,000. British Columbia's Property Transfer Tax starts at 1% and rises to 3%. Alberta has no provincial LTT. Toronto also charges a Municipal Land Transfer Tax layered on top of Ontario's. First-time buyers receive a partial rebate in most provinces.",
  },
  {
    q: 'What is the Principal Residence Exemption?',
    a: "The Principal Residence Exemption (PRE) is a Canadian tax rule that exempts capital gains on the sale of your primary home. This is a significant advantage for the owner: when you sell, no tax is owed on the home's appreciation. The renter's portfolio does not get this exemption — capital gains are taxed at 50% inclusion at your marginal rate.",
  },
  {
    q: 'How do TFSA, FHSA, and RRSP affect the result?',
    a: "Tax shelters shift the renter's advantage. A TFSA gives the renter tax-free growth and no capital gains tax at exit — eliminating the tax disadvantage that normally benefits the owner. An FHSA ($8,000/yr, up to $40,000 lifetime) is tax-deductible like an RRSP and grows tax-free, compounding both effects. An RRSP defers tax until withdrawal; the model reinvests the tax refund. Together, full use of all three shelters can shift the outcome by tens of thousands of dollars over a 25-year horizon.",
  },
  {
    q: 'What does savings discipline mean?',
    a: "Savings discipline is the percentage of the annual cash-flow difference between owner and renter that the renter actually invests. A 100% savings-discipline renter invests every dollar they save. A 80% renter spends 20 cents of every saved dollar. The lower the savings discipline, the weaker the renter's portfolio growth. The default is 100%. The five sensitivity scenarios include 80% and 90% variants.",
  },
  {
    q: 'Can I share my result?',
    a: "Yes. After completing the flow, the result page has a 'Share result' button. On desktop, this copies a link to your clipboard. On mobile, it opens the native share sheet. The link encodes all your inputs in the URL — no account or server storage required. Anyone with the link sees exactly your inputs and outcome.",
  },
  {
    q: 'How many moves are modeled?',
    a: "Owner moves cost realtor commission (default 5%), legal fees, and land transfer tax on the new purchase. Renter moves cost approximately $400 and reset rent to market, bypassing any rent control cap. You can set the number of moves for each side independently in the mobility step. The default is zero moves for both.",
  },
  {
    q: "Why doesn't this calculator show a monthly payment comparison?",
    a: "Monthly payment comparisons mislead because they compare cash flows, not wealth. An owner's monthly payment includes mortgage principal — that's forced savings, not a true cost. A renter investing the equivalent difference builds the same wealth through a portfolio instead. The only fair comparison is total wealth at exit after all costs, taxes, and returns. That's what this calculator shows.",
  },
  {
    q: 'Is this financial advice?',
    a: "No. This calculator is an educational tool that models a financial decision under your assumptions. It does not account for personal circumstances like job security, family needs, emotional value of ownership, or local market dynamics that don't appear in the inputs. Consult a fee-only financial planner before making a decision of this size.",
  },
];

export function FAQItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--color-outline)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '18px 0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.45, letterSpacing: '-0.01em' }}>
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1] }}
          style={{
            fontSize: '16px',
            color: 'var(--color-text-faint)',
            flexShrink: 0,
            marginTop: '1px',
            display: 'inline-block',
            originX: '50%',
            originY: '50%',
          }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.0, 0.0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.7,
                letterSpacing: '-0.005em',
                paddingBottom: '18px',
              }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      {FAQS.map((item, i) => (
        <FAQItem
          key={i}
          q={item.q}
          a={item.a}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}
