# Rent vs Buy Calculator

Canada-only rent vs buy decision calculator, inspired by Ben Felix's framework. Built with Next.js + TypeScript + Tailwind + D3. Pure-TypeScript math engine, unit-tested with Vitest.

Concept docs and research live one level up at `../`. The plan that drove the build is at `C:\Users\antho\.claude\plans\so-what-do-you-twinkly-lerdorf.md`.

## Setup

```bash
npm install
```

## Develop

```bash
npm run dev
```

App at http://localhost:3000.

## Tests

```bash
npm test          # one-shot
npm run test:watch # watch mode
```

## Type check

```bash
npm run typecheck
```

## Architecture

```
app/
├── app/                      Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx              MVP UI shell (Phase 2)
│   └── globals.css
├── components/               (placeholder, charts and inputs will land here)
├── engine/                   Pure-TS financial math, isolated from UI
│   ├── types.ts              CalculatorInputs, YearSnapshot, ExitSummary, SimulationResult
│   ├── fivePercent.ts        Felix's 5% Rule
│   ├── mortgage.ts           Canadian semi-annual compounding amortization
│   ├── taxes.ts              Land transfer tax, CMHC, capital gains
│   ├── defaults.ts           Provincial defaults
│   ├── simulate.ts           Year-by-year owner vs renter wealth simulation
│   ├── citations.ts          Academic paper metadata
│   ├── index.ts              Barrel export
│   └── calc.test.ts          Vitest unit tests
└── (tooling)
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── vitest.config.ts
    └── next.config.js
```

The math engine is the product. UI is a thin presentation layer over it.

## What's done

- [x] Math engine: 5% Rule, mortgage amortization, owner path, renter path, exit summary
- [x] Canadian tax model: provincial LTT (ON, BC, AB, QC, MB, SK, NS/NB/NL/PE), Toronto MLTT, FTB rebate, CMHC premium, capital gains tax
- [x] Provincial defaults for all 10 provinces
- [x] Citations: Eichholtz, Chambers, Beracha & Johnson, Jordà, PWL Capital
- [x] Unit tests (5% Rule, mortgage, taxes, simulation directional sanity)
- [x] Minimal Next.js shell with quick-mode inputs + advanced disclosure

## What's next (Phase 3-4)

- [ ] D3 cumulative-wealth chart with sensitivity band shading
- [ ] Stacked-bar 5% Rule decomposition visualization
- [ ] Methodology page with academic citations rendered
- [ ] URL-encoded state for shareable links
- [ ] RRSP HBP and TFSA simulation toggle
- [ ] Motion-driven slider transitions
- [ ] Accessibility audit
- [ ] PWL 2005-2024 paper fixtures extracted, math engine validated within ±5%
