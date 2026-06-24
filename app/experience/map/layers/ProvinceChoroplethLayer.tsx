'use client';

import { useEffect, useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { FeatureCollection, Feature } from 'geojson';
import type { Province } from '@/engine';
import { suggestPriceAndRent, fivePercentRule } from '@/engine';
import { METRO_CENTROIDS } from '@/engine/data/regions/coordinates';

// Province full name → Province code
const NAME_TO_CODE: Record<string, Province | null> = {
  'Alberta':                   'AB',
  'British Columbia':          'BC',
  'Manitoba':                  'MB',
  'New Brunswick':             'NB',
  'Newfoundland and Labrador': 'NL',
  'Newfoundland':              'NL',
  'Nova Scotia':               'NS',
  'Ontario':                   'ON',
  'Prince Edward Island':      'PE',
  'Quebec':                    'QC',
  'Québec':                    'QC',
  'Saskatchewan':              'SK',
  'Northwest Territories':     null,
  'Nunavut':                   null,
  'Yukon':                     null,
  'Yukon Territory':           null,
};

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

const VERDICT_COLOR: Record<string, string> = {
  'rent-favored': '#0891B2',  // cyan-600
  'buy-favored':  '#D97706',  // amber-600
  'tie':          '#6B7280',  // slate
  '':             '#A1A1AA',
};

// Province metrics — computed once at module level (static data)
interface ProvinceMetric {
  label: string;
  medianPrice: number;
  monthlyRent: number;
  verdict: 'rent-favored' | 'buy-favored' | 'tie' | '';
}

const ALL_PROVINCE_CODES: Province[] = ['ON', 'BC', 'AB', 'QC', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];
const PROVINCE_LABELS: Record<Province, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia',
  NB: 'New Brunswick', NL: 'Newfoundland', PE: 'PEI',
};

function buildProvinceMetrics(): Map<Province, ProvinceMetric> {
  const map = new Map<Province, ProvinceMetric>();
  for (const code of ALL_PROVINCE_CODES) {
    const primary = METRO_CENTROIDS.find(m => m.province === code);
    if (!primary) continue;
    const sug = suggestPriceAndRent(primary.fsa, 'condo-apt');
    if (!sug || sug.medianPrice === 0) continue;
    let verdict: ProvinceMetric['verdict'] = '';
    try {
      const rule = fivePercentRule(sug.medianPrice, sug.suggestedMonthlyRent, {
        propertyTaxPct: sug.propertyTaxPct ?? 0.01,
        maintenancePct: 0.01,
      });
      verdict = rule.verdict;
    } catch { /* ignore */ }
    map.set(code, {
      label: PROVINCE_LABELS[code],
      medianPrice: sug.medianPrice,
      monthlyRent: sug.suggestedMonthlyRent,
      verdict,
    });
  }
  return map;
}

const PROVINCE_METRICS = buildProvinceMetrics();

// Module-level GeoJSON cache — local file, served with gzip by Netlify
let cachedGeoJSON: FeatureCollection | null = null;
let inFlight: Promise<FeatureCollection | null> | null = null;

async function fetchProvinceGeoJSON(): Promise<FeatureCollection | null> {
  if (cachedGeoJSON) return cachedGeoJSON;
  if (inFlight) return inFlight;
  inFlight = fetch('/data/canada-provinces.geojson')
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
    .then(data => { cachedGeoJSON = data; return data; })
    .catch(() => null);
  return inFlight;
}

interface Props {
  selectedProvince: Province;
  hoveredCode: Province | null;
  /** When true, render dim context layer only (non-province steps). */
  contextOnly?: boolean;
}

export function ProvinceChoroplethLayer({ selectedProvince, hoveredCode, contextOnly = false }: Props) {
  const [rawGeoJSON, setRawGeoJSON] = useState<FeatureCollection | null>(cachedGeoJSON);

  useEffect(() => {
    if (rawGeoJSON) return;
    fetchProvinceGeoJSON().then(data => { if (data) setRawGeoJSON(data); });
  }, [rawGeoJSON]);

  const enrichedGeoJSON = useMemo<FeatureCollection | null>(() => {
    if (!rawGeoJSON) return null;
    const features: Feature[] = rawGeoJSON.features.map(feature => {
      const name = (feature.properties?.name ?? '') as string;
      const code = NAME_TO_CODE[name] ?? null;
      const metrics = code ? PROVINCE_METRICS.get(code) : null;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          code: code ?? '',
          medianPrice: metrics?.medianPrice ?? 0,
          monthlyRent: metrics?.monthlyRent ?? 0,
          verdict: metrics?.verdict ?? '',
          hasData: !!metrics,
        },
      };
    });
    return { ...rawGeoJSON, features };
  }, [rawGeoJSON]);

  const fillPaint = useMemo(() => {
    if (contextOnly) {
      return {
        'fill-color': [
          'case',
          ['==', ['get', 'code'], selectedProvince], 'rgba(245,158,11,1)',
          '#333333',
        ] as unknown as string,
        'fill-opacity': [
          'case',
          ['==', ['get', 'code'], selectedProvince], 0.12,
          0.46,
        ] as unknown as number,
      };
    }
    return {
      'fill-color': [
        'case',
        ['==', ['get', 'verdict'], 'rent-favored'], VERDICT_COLOR['rent-favored'],
        ['==', ['get', 'verdict'], 'buy-favored'],  VERDICT_COLOR['buy-favored'],
        ['==', ['get', 'verdict'], 'tie'],          VERDICT_COLOR['tie'],
        VERDICT_COLOR[''],
      ] as unknown as string,
      'fill-opacity': [
        'case',
        ['==', ['get', 'code'], selectedProvince],       0.65,  // selected — vivid
        ['==', ['get', 'code'], hoveredCode ?? ''],      0.40,  // hovered — visible
        ['==', ['get', 'hasData'], true],                0.08,  // unselected — dimmed
        0.03,                                                    // territories — barely visible
      ] as unknown as number,
    };
  }, [contextOnly, selectedProvince, hoveredCode]);

  const linePaint = useMemo(() => {
    if (contextOnly) {
      return {
        'line-color': [
          'case',
          ['==', ['get', 'code'], selectedProvince], 'rgba(245,158,11,0.75)',
          'rgba(0,0,0,0.08)',
        ] as unknown as string,
        'line-width': [
          'case',
          ['==', ['get', 'code'], selectedProvince], 2.5,
          0.4,
        ] as unknown as number,
        'line-opacity': 1,
      };
    }
    return {
      'line-color': [
        'case',
        ['==', ['get', 'code'], selectedProvince],  'rgba(0,0,0,0.80)',
        ['==', ['get', 'code'], hoveredCode ?? ''], 'rgba(0,0,0,0.45)',
        'rgba(0,0,0,0.12)',
      ] as unknown as string,
      'line-width': [
        'case',
        ['==', ['get', 'code'], selectedProvince],  2.5,
        ['==', ['get', 'code'], hoveredCode ?? ''], 1.5,
        0.5,
      ] as unknown as number,
      'line-opacity': 1,
    };
  }, [contextOnly, selectedProvince, hoveredCode]);

  if (!enrichedGeoJSON) return null;

  return (
    <Source id="province-choropleth" type="geojson" data={enrichedGeoJSON}>
      <Layer id="province-choropleth-fill" type="fill" paint={fillPaint} />
      <Layer id="province-choropleth-line" type="line" paint={linePaint} />
    </Source>
  );
}

// Exposed so MapPanel can render hover tooltip without re-importing everything
export { PROVINCE_METRICS, VERDICT_COLOR, fmtCAD as fmtChoroplethCAD };
export type { ProvinceMetric };
