'use client';

import { useMemo } from 'react';
import type { CalculatorInputs, Province, HomeType } from '@/engine';
import {
  suggestPriceAndRent,
  fivePercentRule,
  landTransferTax,
  cmhcPremium,
  monthlyMortgagePayment,
} from '@/engine';
import {
  PROVINCE_CENTROIDS,
  METRO_CENTROIDS,
  metrosForProvince,
  primaryCityForProvince,
} from '@/engine/data/regions/coordinates';
import { STEP, STEP_MAP_CONFIG } from '../config/steps';

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

const CANADA_VIEW: ViewState = { longitude: -96, latitude: 62, zoom: 3.2 };

export interface ProvinceMarker {
  type: 'province';
  id: Province;
  lat: number;
  lng: number;
  label: string;
  isSelected: boolean;
}

export interface MetroMarker {
  type: 'metro';
  id: string;
  lat: number;
  lng: number;
  metro: string;
  province: Province;
  medianPrice: number;
  monthlyRent: number;
  verdict: 'rent-favored' | 'buy-favored' | 'tie' | null;
  breakEvenRent: number | null;
  propertyTaxPct: number | null;
  /** True when this metro matches the user's currently selected city. */
  isSelected: boolean;
}

export type MapMarker = ProvinceMarker | MetroMarker;

export interface MapAnnotation {
  title: string;
  body: string;
  accent: string;
}

export interface SelectionCenter {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface MapState {
  viewState: ViewState;
  markers: MapMarker[];
  mode: 'national' | 'province' | 'city-prices' | 'city-rent-signal' | 'stable';
  label: string;
  interactive: boolean;
  annotation: MapAnnotation | null;
  /** Non-null when a city or borough is selected — drives the dashed ring overlay. */
  selectionCenter: SelectionCenter | null;
}

const PROVINCE_LABELS: Record<Province, string> = {
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  QC: 'Quebec',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  NL: 'Newfoundland',
  PE: 'PEI',
};

const ALL_PROVINCES: Province[] = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];

const HOME_TYPE_LABELS: Record<HomeType, string> = {
  'condo-apt':          'Condo',
  'condo-townhouse':    'Condo townhouse',
  'freehold-townhouse': 'Townhouse',
  'semi-detached':      'Semi-detached',
  'detached':           'Detached',
};

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

function findMetroCentroid(postalCode: string, province: Province) {
  if (!postalCode || postalCode.length < 3) return null;
  const fsa3 = postalCode.substring(0, 3).toUpperCase();
  return (
    METRO_CENTROIDS.find(m => m.fsa === fsa3) ??
    METRO_CENTROIDS.find(m => m.province === province && m.fsa.startsWith(fsa3.substring(0, 2))) ??
    null
  );
}

export function useMapState(step: number, inputs: CalculatorInputs): MapState {
  const config = STEP_MAP_CONFIG[step];

  const mode = config?.mode ?? 'stable';
  const interactive = config?.interactive ?? false;
  const label = config?.label ?? '';

  const viewState = useMemo<ViewState>(() => {
    if (mode === 'national') return CANADA_VIEW;

    if (mode === 'province') {
      // Always center on the province — postalCode city fly-to belongs to city modes.
      const c = PROVINCE_CENTROIDS[inputs.province];
      if (!c) return CANADA_VIEW;
      return { longitude: c.lng, latitude: c.lat, zoom: Math.max(c.zoom - 0.5, 3.5) };
    }

    // city-prices, city-rent-signal, stable
    // CITY step: stay at province zoom until a city is selected so all city bubbles are visible
    if (step === STEP.CITY && !inputs.postalCode) {
      const c = PROVINCE_CENTROIDS[inputs.province];
      if (c) return { longitude: c.lng, latitude: c.lat, zoom: c.zoom };
    }

    // HOME_COMPARE for Toronto: zoom out to show all 6 boroughs in the choropleth
    if (step === STEP.HOME_COMPARE && inputs.postalCode?.toUpperCase().startsWith('M')) {
      return { longitude: -79.40, latitude: 43.69, zoom: 10.5 };
    }

    const fromPC = inputs.postalCode ? findMetroCentroid(inputs.postalCode, inputs.province) : null;
    if (fromPC) return { longitude: fromPC.lng, latitude: fromPC.lat, zoom: fromPC.zoom };

    const city = primaryCityForProvince(inputs.province);
    return { longitude: city.lng, latitude: city.lat, zoom: city.zoom };
  }, [mode, step, inputs.province, inputs.postalCode]);

  const markers = useMemo<MapMarker[]>(() => {
    if (mode === 'national' || mode === 'province') {
      return ALL_PROVINCES.map(p => {
        const c = PROVINCE_CENTROIDS[p];
        return {
          type: 'province' as const,
          id: p,
          lat: c.lat,
          lng: c.lng,
          label: PROVINCE_LABELS[p],
          isSelected: p === inputs.province,
        };
      });
    }

    const metros = metrosForProvince(inputs.province);
    const homeType: HomeType = inputs.homeType ?? 'condo-apt';
    const maintenanceFallback = inputs.maintenancePct;
    const selectedFSA = (inputs.postalCode ?? '').substring(0, 3).toUpperCase();

    return metros.map(m => {
      const suggestion = suggestPriceAndRent(m.fsa, homeType);
      if (!suggestion) {
        return {
          type: 'metro' as const,
          id: m.fsa,
          lat: m.lat,
          lng: m.lng,
          metro: m.metro,
          province: m.province,
          medianPrice: 0,
          monthlyRent: 0,
          verdict: null,
          breakEvenRent: null,
          propertyTaxPct: null,
          isSelected: false,
        };
      }

      const ptax = suggestion.propertyTaxPct ?? inputs.propertyTaxPct;
      let verdict: MetroMarker['verdict'] = null;
      let breakEvenRent: number | null = null;

      try {
        // In rent-signal mode: use the user's actual price so dots answer
        // "at your price, which city's local rent makes buying worthwhile?"
        const priceForVerdict =
          (mode === 'city-rent-signal' || mode === 'stable') && inputs.homePrice > 0
            ? inputs.homePrice
            : suggestion.medianPrice;

        if (priceForVerdict > 0) {
          const rule = fivePercentRule(priceForVerdict, suggestion.suggestedMonthlyRent, {
            propertyTaxPct: ptax,
            maintenancePct: maintenanceFallback,
          });
          verdict = rule.verdict;
          breakEvenRent = rule.monthlyBreakEvenRent;
        }
      } catch {
        // ignore
      }

      return {
        type: 'metro' as const,
        id: m.fsa,
        lat: m.lat,
        lng: m.lng,
        metro: m.metro,
        province: m.province,
        medianPrice: suggestion.medianPrice,
        monthlyRent: suggestion.suggestedMonthlyRent,
        verdict,
        breakEvenRent,
        propertyTaxPct: ptax ?? null,
        isSelected: selectedFSA.length === 3 && m.fsa === selectedFSA,
      };
    });
  }, [mode, inputs.province, inputs.homeType, inputs.propertyTaxPct, inputs.maintenancePct, inputs.homePrice, inputs.postalCode]);

  const annotation = useMemo<MapAnnotation | null>(() => {
    const homeType = inputs.homeType ?? 'condo-apt';
    const metro =
      (inputs.postalCode ? findMetroCentroid(inputs.postalCode, inputs.province) : null) ??
      METRO_CENTROIDS.find(m => m.province === inputs.province) ??
      null;
    const cityName = metro?.metro ?? '';
    const cityFSA = metro?.fsa ?? '';

    try {
      switch (step) {
        case STEP.CITY: {
          if (!inputs.postalCode || !cityFSA) return null;
          const sug = suggestPriceAndRent(cityFSA, homeType);
          if (!sug || sug.medianPrice === 0) return null;
          return {
            title: `Median in ${cityName}`,
            body: fmtCAD.format(sug.medianPrice),
            accent: 'var(--color-owner)',
          };
        }

        case STEP.HOME_COMPARE: {
          if (!inputs.homePrice) return null;
          const ltt = landTransferTax(inputs.homePrice, inputs.province, {
            isTorontoMunicipalLTT: inputs.isTorontoMunicipalLTT,
            isFirstTimeBuyer: inputs.isFirstTimeBuyer,
          });
          if (inputs.isFirstTimeBuyer) {
            const lttFull = landTransferTax(inputs.homePrice, inputs.province, {
              isTorontoMunicipalLTT: inputs.isTorontoMunicipalLTT,
              isFirstTimeBuyer: false,
            });
            const rebate = lttFull.total - ltt.total;
            if (rebate > 0) return {
              title: 'First-time buyer rebate',
              body: `Saves ${fmtCAD.format(rebate)} at closing`,
              accent: 'var(--color-renter)',
            };
          }
          return {
            title: 'Land transfer tax',
            body: `${fmtCAD.format(ltt.total)} due at closing in ${PROVINCE_LABELS[inputs.province]}`,
            accent: 'var(--color-text-faint)',
          };
        }

        case STEP.HOME_PRICE: {
          if (!cityFSA || !cityName || !inputs.homePrice) return null;
          const sug = suggestPriceAndRent(cityFSA, homeType);
          if (!sug || sug.medianPrice === 0) return null;
          const pct = ((inputs.homePrice - sug.medianPrice) / sug.medianPrice) * 100;
          const sign = pct >= 0 ? '+' : '';
          const accent =
            pct > 10 ? 'var(--color-owner)' : pct < -10 ? 'var(--color-renter)' : 'var(--color-text-faint)';
          return {
            title: 'Your price vs median',
            body: `${sign}${pct.toFixed(0)}% vs ${fmtCAD.format(sug.medianPrice)} in ${cityName}`,
            accent,
          };
        }

        case STEP.RENT: {
          if (!inputs.homePrice || !inputs.monthlyRent) return null;
          const rule = fivePercentRule(inputs.homePrice, inputs.monthlyRent, {
            propertyTaxPct: inputs.propertyTaxPct,
            maintenancePct: inputs.maintenancePct,
          });
          const diff = inputs.monthlyRent - rule.monthlyBreakEvenRent;
          const pct = Math.abs((diff / rule.monthlyBreakEvenRent) * 100).toFixed(0);
          const dir = diff > 0 ? 'above' : 'below';
          return {
            title: `Break-even rent: ${fmtCAD.format(rule.monthlyBreakEvenRent)}/mo`,
            body: `Your rent is ${fmtCAD.format(inputs.monthlyRent)}/mo — ${pct}% ${dir} break-even`,
            accent: rule.verdict === 'rent-favored' ? 'var(--color-renter)' : 'var(--color-owner)',
          };
        }

        case STEP.HORIZON: {
          if (!inputs.homePrice || !inputs.monthlyRent) return null;
          const years = inputs.holdingPeriodYears ?? 10;
          const band =
            years < 5  ? 'Transaction costs barely started amortizing.' :
            years < 10 ? 'Getting into the range where buying can compete.' :
                         'Long enough for ownership costs to fully amortize.';
          const accent =
            years < 5  ? 'var(--color-renter)' :
            years < 10 ? 'var(--color-cross)'  :
                         'var(--color-owner)';
          return {
            title: `${years}-year horizon`,
            body: band,
            accent,
          };
        }

        case STEP.DOWN_PAYMENT: {
          if (!inputs.homePrice) return null;
          const ltt = landTransferTax(inputs.homePrice, inputs.province, {
            isTorontoMunicipalLTT: inputs.isTorontoMunicipalLTT,
            isFirstTimeBuyer: inputs.isFirstTimeBuyer,
          });
          const cmhcAmt = cmhcPremium(inputs.homePrice, inputs.downPaymentPct);
          const total = ltt.total + cmhcAmt + 2500;
          return {
            title: `Closing costs in ${cityName || inputs.province}`,
            body: `~${fmtCAD.format(total)} (LTT ${fmtCAD.format(ltt.total)} + CMHC ${fmtCAD.format(cmhcAmt)} + legal)`,
            accent: 'var(--color-owner)',
          };
        }

        case STEP.MORTGAGE: {
          if (!inputs.homePrice || !inputs.mortgageRatePct) return null;
          const principal = inputs.homePrice * (1 - inputs.downPaymentPct);
          const pmt = monthlyMortgagePayment(principal, inputs.mortgageRatePct, inputs.amortizationYears);
          const ptaxMonthly = (inputs.homePrice * inputs.propertyTaxPct) / 12;
          const pith = Math.round(pmt + ptaxMonthly + 150);
          return {
            title: 'Monthly ownership cost',
            body: `${fmtCAD.format(pith)}/mo (P+I ${fmtCAD.format(Math.round(pmt))} + tax + heat)`,
            accent: 'var(--color-owner)',
          };
        }

        case STEP.FINANCES: {
          const currentYear = new Date().getFullYear();
          const birthYear = inputs.birthYear ?? (currentYear - 30);
          const age = currentYear - birthYear;
          const income = inputs.annualIncome ?? 80000;
          const yearsEligible = Math.max(0, Math.min(age - 18, currentYear - 2009));
          const tfsaRoom = yearsEligible * 6000;
          const rrspAnnual = Math.min(Math.round(income * 0.18), 31560);
          return {
            title: `Account room at age ${age}`,
            body: `~${fmtCAD.format(tfsaRoom)} TFSA lifetime · ${fmtCAD.format(rrspAnnual)}/yr RRSP`,
            accent: 'var(--color-text-faint)',
          };
        }

        case STEP.SHELTERS: {
          const marginalRate = inputs.marginalTaxRatePct ?? 0.40;
          const fhsaDeduction = Math.round(8000 * marginalRate);
          return {
            title: 'First-year FHSA deduction',
            body: `~${fmtCAD.format(fhsaDeduction)} back at your income. TFSA shields all investment growth tax-free.`,
            accent: 'var(--color-renter)',
          };
        }

        case STEP.MOBILITY: {
          if (!inputs.homePrice) return null;
          const ownerCost = Math.round(inputs.homePrice * 0.09);
          const renterCost = Math.round((inputs.monthlyRent ?? 2000) * 2);
          return {
            title: 'Cost per move',
            body: `Owner: ~${fmtCAD.format(ownerCost)} (9% of home). Renter: ~${fmtCAD.format(renterCost)} (2 months rent).`,
            accent: 'var(--color-text-faint)',
          };
        }

        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [step, inputs]);

  const selectionCenter = useMemo<SelectionCenter | null>(() => {
    // Province step: no ring (province dots + choropleth handle the visual)
    if (mode === 'national' || mode === 'province') return null;
    if (!inputs.postalCode) return null;
    const metro = findMetroCentroid(inputs.postalCode, inputs.province);
    if (!metro) return null;
    // Toronto FSAs all start with M — show a borough-scale ring
    const isToronto = inputs.postalCode.toUpperCase().startsWith('M');
    return { lat: metro.lat, lng: metro.lng, radiusKm: isToronto ? 4 : 18 };
  }, [mode, inputs.postalCode, inputs.province]);

  return { viewState, markers, mode, label, interactive, annotation, selectionCenter };
}
