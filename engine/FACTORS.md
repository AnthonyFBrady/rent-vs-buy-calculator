# Rent vs Buy — Factor Audit

Every input that affects the final wealth comparison is listed here. Use this document to:
- Audit why a result changed unexpectedly
- Find where a factor is computed when debugging
- Understand which side a factor favors and why
- Know the default source before changing a value

---

## Reading the table

| Column | Meaning |
|--------|---------|
| Factor | Human name for the input or computed value |
| Input field | Key on `CalculatorInputs` |
| Default source | Where the default comes from |
| Affects | O = owner path, R = renter path |
| Direction | Which side this factor tends to favor (holding all else equal) |
| Computed in | File + approximate line range |

Favors **owner** = a higher value improves the owner's relative outcome.
Favors **renter** = a higher value improves the renter's relative outcome.
**Neutral** = affects both paths equally (e.g., investment return).

---

## 1. Purchase parameters

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Home price | `homePrice` | `ontarioBoroughs.ts` / provincial defaults | O + R | Owner (larger asset base and equity) | `simulate.ts` ~160 |
| Down payment % | `downPaymentPct` | `defaults.ts` (20%) | O + R | Renter (larger renter starting portfolio) | `simulate.ts` ~162 |
| Prior equity deployed | `ownerPriorEquity` | 0 | O + R | Neutral — both sides start with same capital | `simulate.ts` ~170 |
| CMHC premium | computed from `downPaymentPct` | `taxes.ts` | O | Owner (adds to loan, reduces equity) | `simulate.ts` ~163–165 |
| CMHC PST | computed + `province` | `taxes.ts` | O | Owner (ON/QC/SK only) | `simulate.ts` ~166 |
| Land transfer tax | `province`, `isFirstTimeBuyer` | `taxes.ts` | O + R | Renter (unrecoverable owner cost; equivalent capital invested by renter earns returns) | `simulate.ts` ~167 |
| Legal fees at purchase | `legalFeesAtPurchase` | `defaults.ts` ($1,500) | O | Owner | `simulate.ts` ~168 |
| First-time buyer | `isFirstTimeBuyer` | `defaults.ts` (false) | O + R | Owner (rebate reduces owner closing cost and reduces renter starting capital equally) | `taxes.ts` |
| Toronto municipal LTT | `isTorontoMunicipalLTT` | `defaults.ts` (false) | O | Owner (additional LTT layer) | `taxes.ts` |
| Home type | `homeType` | province default | O | Depends (drives maintenance and strata defaults) | `homeType.ts` |

---

## 2. Financing

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Mortgage rate (initial) | `mortgageRatePct` | `defaults.ts` (5%) | O | Owner (higher rate = higher unrecoverable cost = renter favored) | `simulate.ts` ~190–220 |
| Mortgage term length | `mortgageTermYears` | `defaults.ts` (5 yr) | O | Neutral (sets renewal timing) | `simulate.ts` ~190 |
| Renewal rate | `mortgageRenewalRatePct` | equals `mortgageRatePct` | O | Owner (higher renewal = more unrecoverable interest post-renewal) | `simulate.ts` ~200 |
| Amortization period | `amortizationYears` | `defaults.ts` (25 yr) | O | Owner (shorter = faster equity build, more P+I early) | `simulate.ts` ~215 |
| Annual interest payment | computed | mortgage math | O | Owner (unrecoverable, large early) | `simulate.ts` ~297–299 |
| Annual principal payment | computed | mortgage math | O | Owner (equity-building, not a cost) | `simulate.ts` ~299 |

---

## 3. Ownership carrying costs (annual, unrecoverable)

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Property tax | `propertyTaxPct` | `defaults.ts` by province | O | Owner (higher = worse for owner) | `simulate.ts` ~300 |
| Maintenance | `maintenancePct` | `homeType.ts` (1.0–1.5%) | O | Owner (higher = worse for owner) | `simulate.ts` ~301 |
| Home insurance | `homeInsuranceMonthly` | `defaults.ts` ($150/mo) | O | Owner | `simulate.ts` ~302 |
| Condo/strata fee | `monthlyStrataFee` | `homeType.ts` (0 for detached) | O | Owner | `simulate.ts` ~303 |
| Home appreciation | `homeAppreciationPct` | `homeType.ts` by type | O | Owner (increases equity, also increases tax/maint base) | `simulate.ts` ~434 |
| Insurance escalation | constant: CPI + 3% | hardcoded in `simulate.ts` | O + R | Neutral (both sides' insurance escalates) | `simulate.ts` const |

---

## 4. Transaction costs at exit and on moves

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Realtor commission | `realtorCommissionPct` | `defaults.ts` (5%) | O | Owner (reduces sale proceeds) | `simulate.ts` ~308, exit |
| Legal fees at sale | `legalFeesAtSale` | `defaults.ts` ($1,200) | O | Owner | `simulate.ts` ~314, exit |
| Owner moves (count) | `ownerMoves` | `defaults.ts` (0) | O | Owner (each move = ~9% friction) | `simulate.ts` ~306–314 |
| Owner moving cost/move | `ownerMovingCostPerMove` | `defaults.ts` ($2,500) | O | Owner | `simulate.ts` ~306 |
| Renter moves (count) | `renterMoves` | `defaults.ts` (0) | R | Renter (each move resets rent to market) | `simulate.ts` ~327 |
| Renter moving cost/move | `renterMovingCostPerMove` | `defaults.ts` ($400) | R | Renter | `simulate.ts` ~327 |

---

## 5. Renter path — rent inputs

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Monthly rent | `monthlyRent` | `postalCode.ts` / `ontarioBoroughs.ts` | R | Renter (lower rent = more invest-the-difference) | `simulate.ts` ~333 |
| Rent escalation rate | `rentEscalationPct` | `defaults.ts` (5%) | R | Owner (higher market rent growth = less renter advantage over time) | `simulate.ts` ~492 |
| Rent control cap | `rentControlCapPct` | `defaults.ts` by province | R | Renter (cap means in-place rent rises slower than market) | `simulate.ts` ~291–294 |
| Rent insurance | `rentInsuranceMonthly` | `defaults.ts` ($25/mo) | R | Owner (small cost to renter) | `simulate.ts` ~334 |
| Deposit (first+last) | computed: 2 × monthly rent | — | R | Owner (reduces renter's starting invested capital) | `simulate.ts` ~173–174 |

---

## 6. Investment and returns

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Investment return | `investmentReturnPct` | `defaults.ts` (7.0%) | R (primarily) | Renter (higher returns compound the renter's invest-the-difference) | `simulate.ts` ~413–430 |
| Investment fee | `investmentFeePct` | `defaults.ts` (0.60%) | R (primarily) | Owner (higher fees hurt renter's net return) | `simulate.ts` net return |
| Net investment return | computed: return − fee | — | R | Renter | used throughout |
| Inflation rate | `inflationPct` | `defaults.ts` (2.0%) | O + R | Neutral (escalates strata fee; used as floor for insurance) | `simulate.ts` ~495 |
| Savings discipline (renter) | `renterSavingsDisciplinePct` | `savingsDisciplinePct` | R | Renter (< 100% means renter pockets the difference, losing the comparison) | `simulate.ts` ~353 |
| Savings discipline (owner) | `ownerSavingsDisciplinePct` | `savingsDisciplinePct` | O | Owner (post-payoff surplus investment rate) | `simulate.ts` ~360 |
| Global discipline | `savingsDisciplinePct` | `defaults.ts` (100%) | O + R | **Most load-bearing assumption** | both sides |

---

## 7. Tax shelter — renter side

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Marginal tax rate | `marginalTaxRatePct` | `defaults.ts` (43%) | O + R | Both (drives RRSP/FHSA refund size, renter cap gains, and owner surplus cap gains at exit) | `simulate.ts` ~384, 398, exit |
| RRSP withdrawal tax rate | `rrspWithdrawalTaxRatePct` | equals marginal rate | R | Renter (lower rate at exit improves RRSP advantage) | `simulate.ts` exit ~532 |
| Uses TFSA | `renterUsesTFSA` | `defaults.ts` (false) | R | Renter (shelters all capital gains) | `simulate.ts` ~364–375 |
| TFSA room override | `renterTfsaRoomOverride` | computed from `birthYear` | R | Renter (more room = more sheltered gains) | `simulate.ts` ~139–150 |
| Birth year (TFSA room) | `birthYear` | `defaults.ts` (1990) | R | Renter (earlier birth = more accumulated room) | `simulate.ts` ~134 |
| Uses FHSA | `useFHSA` | `defaults.ts` (false) | R | Renter (deductible contributions + tax-free growth) | `simulate.ts` ~377–390 |
| FHSA room override | `renterFhsaRoomOverride` | 40,000 | R | Renter (more room = larger deductible base) | `simulate.ts` ~155 |
| Uses RRSP | `renterUsesRRSP` | `defaults.ts` (false) | R | Renter (deferred tax, refund reinvested; taxed at exit) | `simulate.ts` ~392–404 |
| RRSP carryforward | `renterRrspCarryforward` | `defaults.ts` (0) | R | Renter (extra room in year 1) | `simulate.ts` ~153 |
| Annual income (RRSP room) | `annualIncome` | `defaults.ts` ($120k) | R | Renter (18% of income = annual RRSP room, max $31,560) | `simulate.ts` ~395 |

---

## 8. Exit

| Factor | Input field | Default source | Affects | Direction | Computed in |
|--------|-------------|----------------|---------|-----------|-------------|
| Holding period | `holdingPeriodYears` | `defaults.ts` (10 yr) | O + R | **Owner (longer = more time to recover transaction costs)** | `simulate.ts` loop |
| Owner cap gains tax | computed | `taxes.ts` | O | Owner (50% inclusion, owner's invested surplus only — PRE exempts the home) | `simulate.ts` ~515 |
| Renter cap gains tax | computed | `taxes.ts` | R | Owner (50% inclusion on taxable gains) | `simulate.ts` ~524 |
| FHSA exit tax | none (0) | — | R | Renter (FHSA gains exit tax-free) | `simulate.ts` ~526 |
| RRSP exit tax | `rrspWithdrawalTaxRatePct` × balance | — | R | Owner (erodes RRSP advantage at exit) | `simulate.ts` ~532–534 |
| Deposit returned | computed: 2 × current market rent | — | R | Renter (lowers net deposit cost over time) | `simulate.ts` exit |

---

## 9. Constants hardcoded in simulate.ts

These are not exposed as inputs. Changing them requires editing `simulate.ts` directly.

| Constant | Value | Affects | Notes |
|----------|-------|---------|-------|
| `TFSA_ANNUAL_ACCRUAL` | $7,000 | R | Annual room accrual |
| `TFSA_LIFETIME_CAP` | $95,000 | R | Through 2025 |
| `FHSA_ANNUAL_ROOM` | $8,000 | R | Annual contribution limit |
| `FHSA_LIFETIME_LIMIT` | $40,000 | R | Lifetime cap |
| RRSP annual room formula | min(income × 18%, $31,560) | R | CRA limits |
| Insurance escalation | CPI + 3% | O + R | Both home and renter insurance |

---

## 10. Decision tree — which factors dominate?

For a typical Canadian buyer (ON, 20% down, 25yr amort, 5.5% rate, $750k home):

1. **Holding period** — the single largest swing factor. < 5 years almost always favors renting.
2. **Investment return vs home appreciation** — determines long-term trajectory.
3. **Savings discipline** — renting loses if < 100%. No other factor comes close in magnitude.
4. **Rent-to-price ratio** — below 3% favors buying, above 5% favors renting.
5. **Down payment size** — larger down = larger renter starting portfolio = renter advantage early.
6. **Tax shelters (TFSA/FHSA)** — can close a 10–15% gap in renter's favor over 20 years.
7. **Rent control** — meaningful in ON; long-tenure discount of 20–40% vs market is load-bearing.
8. **Mortgage rate / renewal rate** — significant at the margin; dominated by return differential long-term.
9. **Move frequency** — owner moves are extremely expensive (~9% of home value each time).

---

## How to add a new factor

1. Add the input field to `CalculatorInputs` in `engine/types.ts` (optional with `?`)
2. Add a default in `engine/defaults.ts`
3. Add the URL short key in `engine/urlState.ts`
4. Implement in `engine/simulate.ts` — find the section by factor category above
5. Add a row to this document
6. Add a new step in `app/experience/config/steps.ts` and `app/experience/steps/` if it needs a UI question
7. Add ChalkPanel context content in `app/experience/components/ChalkPanel.tsx`
