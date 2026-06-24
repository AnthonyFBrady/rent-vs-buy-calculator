'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { CalculatorInputs, Province } from '@/engine';
import { defaultInputsFor, suggestPriceAndRent } from '@/engine';
import { metrosForProvince } from '@/engine/data/regions/coordinates';
import type { MetroMarker } from './useMapState';
import { useMapState } from './useMapState';
import { STEP } from '../config/steps';
import { NationalView } from './layers/NationalView';
import { PriceMarkerLayer } from './layers/PriceMarkerLayer';
import { RentBuySignalLayer } from './layers/RentBuySignalLayer';
import { ProvinceChoroplethLayer, PROVINCE_METRICS, VERDICT_COLOR, fmtChoroplethCAD } from './layers/ProvinceChoroplethLayer';
import { SelectedAreaLayer } from './layers/SelectedAreaLayer';
import { CityAreaLayer, type CityAreaData, fsaToBoroughId } from './layers/CityAreaLayer';
import { BED_PRICE_MULT, BED_RENT_MULT } from '../steps/StepHomeCompare';

// CartoDB Positron — clean light base, pairs with the light UI
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Approximate bounding boxes per province [SW, NE] in [lng, lat].
// Used to restrict pan/zoom after the user drills into a province or city.
const PROVINCE_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  ON: [[-95.2, 41.7],  [-74.4, 56.9]],
  BC: [[-139.1, 48.2], [-114.0, 60.1]],
  AB: [[-120.0, 49.0], [-110.0, 60.1]],
  QC: [[-79.7, 44.9],  [-57.1, 62.6]],
  MB: [[-102.1, 48.9], [-88.9, 60.1]],
  SK: [[-110.0, 48.9], [-101.4, 60.1]],
  NS: [[-66.4, 43.4],  [-59.7, 47.1]],
  NB: [[-69.1, 44.5],  [-63.8, 48.1]],
  NL: [[-68.0, 46.6],  [-52.6, 60.5]],
  PE: [[-64.5, 45.9],  [-61.9, 47.1]],
};

// GTA overview bounds — wide enough to show all 6 Toronto borough polygons
const GTA_BOUNDS: [[number, number], [number, number]] = [[-79.68, 43.57], [-79.13, 43.80]];

// Canada extents — prevents panning deep into the US or polar regions
const CANADA_BOUNDS: [[number, number], [number, number]] = [[-145, 41.5], [-52, 84]];

// Steps that show the Toronto borough choropleth
const CITY_AREA_STEPS = new Set<number>([STEP.HOME_COMPARE, STEP.HOME_PRICE, STEP.RENT]);

const fmtCADShort = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Province labels for the pending selection display
const PROVINCE_LABELS: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia',
  NB: 'New Brunswick', NL: 'Newfoundland', PE: 'PEI',
};

type MapPending =
  | { kind: 'province'; province: Province; label: string }
  | { kind: 'city'; fsa: string; label: string; homePrice?: number; monthlyRent?: number; propertyTaxPct?: number }
  | null;

interface Props {
  step: number;
  inputs: CalculatorInputs;
  onPatch: (p: Partial<CalculatorInputs>) => void;
  /** Called after a province or city is confirmed (via the button bar confirm). */
  onAdvance?: () => void;
  /** Current pending map selection — used to highlight the tapped province/city. */
  pendingSelection?: MapPending;
  /** Called when the user taps a province or city — sets pending state in page.tsx. */
  onPendingSelect?: (pending: MapPending) => void;
  /** True once the user has clicked "Confirm what I'd buy" in HOME_COMPARE step. */
  homeCompareBuyConfirmed?: boolean;
}

export function MapPanel({ step, inputs, onPatch, onAdvance, pendingSelection, onPendingSelect, homeCompareBuyConfirmed }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { viewState, markers, mode, label, interactive, annotation, selectionCenter } = useMapState(step, inputs);

  const isProvinceMode = mode === 'province';

  // Whether the selected city is Toronto (postalCode starts with 'M')
  const isToronto = !!(inputs.postalCode?.toUpperCase().startsWith('M'));
  // Show the borough choropleth on these steps when in Toronto
  const showCityAreaLayer = isToronto && CITY_AREA_STEPS.has(step);

  // Choropleth metric: price during buy sub-phase of HOME_COMPARE, rent after confirm or on RENT step
  const cityAreaMetric: 'price' | 'rent' =
    step === STEP.RENT ? 'rent' :
    step === STEP.HOME_COMPARE && homeCompareBuyConfirmed ? 'rent' :
    'price';

  // On HOME_COMPARE before buy is confirmed, show price markers (not rent-buy signal)
  const effectiveMode = (step === STEP.HOME_COMPARE && !homeCompareBuyConfirmed) ? 'city-prices' : mode;

  const buyBedMult  = BED_PRICE_MULT[inputs.buyBedrooms  ?? 2] ?? 1;
  const rentBedMult = BED_RENT_MULT[ inputs.rentBedrooms ?? inputs.buyBedrooms ?? 2] ?? 1;

  // Province hover state — used for choropleth tooltip
  const [hoveredProvinceCode, setHoveredProvinceCode] = useState<Province | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // City area hover state — used for borough choropleth tooltip
  const [hoveredCityAreaId, setHoveredCityAreaId] = useState<string | null>(null);
  const [hoveredCityAreaData, setHoveredCityAreaData] = useState<CityAreaData | null>(null);
  const [cityAreaHoverPoint, setCityAreaHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // Merged effect: set maxBounds BEFORE flyTo to avoid the race condition where
  // a stale tight-bounds constraint prevents flying to a wider Canada view on back-navigation.
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;
    const rawMap = ref.getMap();

    let bounds: [[number, number], [number, number]] | null = null;
    if (step <= STEP.CITY) {
      // Province and city steps: loose Canada bounds so fitBounds can show all province cities
      // without being clipped by a tight province boundary box.
      bounds = CANADA_BOUNDS;
    } else if (showCityAreaLayer) {
      bounds = GTA_BOUNDS;
    } else if (selectionCenter) {
      const { lat, lng, radiusKm } = selectionCenter;
      const latPad = (radiusKm / 111.32) * 2.2;
      const lngPad = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * 2.2;
      bounds = [[lng - lngPad, lat - latPad], [lng + lngPad, lat + latPad]];
    } else {
      bounds = (PROVINCE_BOUNDS[inputs.province] as [[number, number], [number, number]]) ?? null;
    }
    rawMap?.setMaxBounds(bounds);

    // On CITY step with no city selected yet, fit the viewport to all province cities
    // so every market option is visible without any manual panning.
    if (step === STEP.CITY && !inputs.postalCode) {
      const metros = metrosForProvince(inputs.province);
      if (metros.length > 0) {
        const lngs = metros.map(m => m.lng);
        const lats = metros.map(m => m.lat);
        ref.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 80, maxZoom: 8, duration: 1800, essential: true, easing: easeInOutQuad },
        );
        return;
      }
    }

    ref.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      duration: 1500,
      essential: true,
      easing: easeInOutQuad,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState.longitude, viewState.latitude, viewState.zoom, step, selectionCenter, inputs.province, showCityAreaLayer, inputs.postalCode]);

  const handleProvinceClick = useCallback(
    (province: Province) => {
      if (!interactive) return;
      // Patch immediately so the chip in the card updates; advance is triggered by the Continue button
      const next = defaultInputsFor(province);
      onPatch({
        province,
        postalCode: undefined as unknown as string,
        propertyTaxPct: next.propertyTaxPct,
        rentControlCapPct: next.rentControlCapPct,
        marginalTaxRatePct: next.marginalTaxRatePct,
        isTorontoMunicipalLTT: false,
      });
    },
    [interactive, onPatch],
  );

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    if (!isProvinceMode || !interactive) return;
    const feature = e.features?.[0];
    if (feature?.layer?.id === 'province-choropleth-fill') {
      const code = feature.properties?.code as Province | undefined;
      if (code) handleProvinceClick(code);
    }
  }, [isProvinceMode, interactive, handleProvinceClick]);

  const handleCityMarkerClick = useCallback(
    (marker: MetroMarker) => {
      const homeType = inputs.homeType ?? 'condo-apt';
      const suggestion = suggestPriceAndRent(marker.id, homeType);
      const provDefaults = defaultInputsFor(inputs.province);
      // Set pending — user must confirm via the button bar before patch + advance
      onPendingSelect?.({
        kind: 'city',
        fsa: marker.id,
        label: marker.metro,
        homePrice: suggestion?.medianPrice,
        monthlyRent: suggestion ? Math.round(suggestion.suggestedMonthlyRent) : undefined,
        propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
      });
    },
    [inputs.homeType, inputs.province, onPendingSelect],
  );


  // Clear province hover when leaving province step
  useEffect(() => {
    if (!isProvinceMode) {
      setHoveredProvinceCode(null);
      setHoverPoint(null);
    }
  }, [isProvinceMode]);

  // Clear city area hover when leaving the choropleth steps
  useEffect(() => {
    if (!showCityAreaLayer) {
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
    }
  }, [showCityAreaLayer]);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.layer?.id === 'city-area-fill') {
      const id = feature.properties?.id as string | undefined;
      setHoveredCityAreaId(id ?? null);
      setCityAreaHoverPoint({ x: e.point.x, y: e.point.y });
      if (id) {
        setHoveredCityAreaData({
          id,
          label: feature.properties?.label as string ?? id,
          fsa: id,
          price: feature.properties?.price as number ?? 0,
          rent:  feature.properties?.rent  as number ?? 0,
        });
      }
      setHoveredProvinceCode(null);
      setHoverPoint(null);
    } else if (feature?.layer?.id === 'province-choropleth-fill') {
      const code = feature.properties?.code as Province | undefined;
      setHoveredProvinceCode(code || null);
      setHoverPoint({ x: e.point.x, y: e.point.y });
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
    } else {
      setHoveredProvinceCode(null);
      setHoverPoint(null);
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredProvinceCode(null);
    setHoverPoint(null);
    setHoveredCityAreaId(null);
    setHoveredCityAreaData(null);
    setCityAreaHoverPoint(null);
  }, []);

  // Re-fit the city cluster whenever the map panel resizes (browser window resize, sidebar open/close).
  // duration:0 snaps instantly — no animation mid-resize.
  const handleMapResize = useCallback(() => {
    if (step !== STEP.CITY || inputs.postalCode) return;
    const metros = metrosForProvince(inputs.province);
    if (!metros.length || !mapRef.current) return;
    const lngs = metros.map(m => m.lng);
    const lats = metros.map(m => m.lat);
    mapRef.current.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 80, maxZoom: 8, duration: 0 },
    );
  }, [step, inputs.postalCode, inputs.province]);

  const provinceMarkers = markers.filter(m => m.type === 'province') as import('./useMapState').ProvinceMarker[];
  const metroMarkers    = markers.filter(m => m.type === 'metro')    as import('./useMapState').MetroMarker[];

  const showChoropleth = !showCityAreaLayer && (isProvinceMode || mode === 'city-prices' || mode === 'city-rent-signal' || mode === 'stable');

  const hoveredMetric = hoveredProvinceCode ? PROVINCE_METRICS.get(hoveredProvinceCode) : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      {/* Floating label chip */}
      {label && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'var(--color-bg)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-outline)',
            borderRadius: '9999px',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            letterSpacing: '-0.01em',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {label}
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: viewState.longitude,
          latitude: viewState.latitude,
          zoom: viewState.zoom,
        }}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        reuseMaps
        interactiveLayerIds={[
          ...(isProvinceMode   ? ['province-choropleth-fill'] : []),
          ...(showCityAreaLayer ? ['city-area-fill'] : []),
        ]}
        onClick={isProvinceMode ? handleMapClick : undefined}
        onMouseMove={isProvinceMode || showCityAreaLayer ? handleMouseMove : undefined}
        onMouseLeave={isProvinceMode || showCityAreaLayer ? handleMouseLeave : undefined}
        onResize={handleMapResize}
        cursor={
          (isProvinceMode && hoveredProvinceCode) || (showCityAreaLayer && hoveredCityAreaId)
            ? 'pointer'
            : 'grab'
        }
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Province choropleth: full color on province step, dim context on others */}
        {showChoropleth && (
          <ProvinceChoroplethLayer
            selectedProvince={inputs.province}
            hoveredCode={hoveredProvinceCode}
            contextOnly={!isProvinceMode}
          />
        )}

        {/* Province dot markers (province mode only — rendered on top of choropleth) */}
        {isProvinceMode && (
          <NationalView
            markers={provinceMarkers}
            interactive={interactive}
            onProvinceClick={handleProvinceClick}
          />
        )}

        {effectiveMode === 'city-prices' && !showCityAreaLayer && (
          <PriceMarkerLayer
            markers={metroMarkers}
            onCityClick={step === STEP.CITY ? handleCityMarkerClick : undefined}
            pendingFSA={pendingSelection?.kind === 'city' ? pendingSelection.fsa : null}
          />
        )}

        {(effectiveMode === 'city-rent-signal' || effectiveMode === 'stable') && !showCityAreaLayer && (
          <RentBuySignalLayer markers={metroMarkers} />
        )}

        {/* Dashed ring for selected city — hidden when borough choropleth takes over */}
        {selectionCenter && !showCityAreaLayer && (
          <SelectedAreaLayer
            lat={selectionCenter.lat}
            lng={selectionCenter.lng}
            radiusKm={selectionCenter.radiusKm}
          />
        )}

        {/* Toronto borough choropleth — HOME_COMPARE, HOME_PRICE, RENT steps */}
        {showCityAreaLayer && (
          <CityAreaLayer
            metric={cityAreaMetric}
            homeType={inputs.homeType ?? 'condo-apt'}
            buyBedMult={buyBedMult}
            rentBedMult={rentBedMult}
            hoveredId={hoveredCityAreaId}
            selectedFSA={inputs.postalCode}
          />
        )}
      </Map>

      {/* Province hover tooltip */}
      {isProvinceMode && hoverPoint && hoveredProvinceCode && hoveredMetric && (
        <div
          style={{
            position: 'absolute',
            left: hoverPoint.x + 14,
            top: Math.max(8, hoverPoint.y - 60),
            zIndex: 20,
            background: 'rgba(15,15,14,0.82)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${VERDICT_COLOR[hoveredMetric.verdict] ?? 'var(--color-outline)'}50`,
            borderLeft: `3px solid ${VERDICT_COLOR[hoveredMetric.verdict] ?? 'var(--color-outline)'}`,
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            pointerEvents: 'none',
            minWidth: '170px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
            {hoveredMetric.label}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{fmtChoroplethCAD.format(hoveredMetric.medianPrice)}</span>
            {' '}median (condo)
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{fmtChoroplethCAD.format(hoveredMetric.monthlyRent)}/mo</span>
            {' '}est. rent
          </div>
          {hoveredMetric.verdict && (
            <div style={{
              marginTop: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: VERDICT_COLOR[hoveredMetric.verdict],
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {hoveredMetric.verdict === 'rent-favored' ? 'Renting favored' : hoveredMetric.verdict === 'buy-favored' ? 'Buying favored' : 'Roughly tied'}
            </div>
          )}
        </div>
      )}

      {/* Toronto borough hover tooltip */}
      {showCityAreaLayer && cityAreaHoverPoint && hoveredCityAreaData && (
        <div
          style={{
            position: 'absolute',
            left: cityAreaHoverPoint.x + 14,
            top: Math.max(8, cityAreaHoverPoint.y - 80),
            zIndex: 20,
            background: 'rgba(15,15,14,0.82)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${cityAreaMetric === 'price' ? 'rgba(var(--brand-owner-rgb),0.35)' : 'rgba(var(--brand-renter-rgb),0.35)'}`,
            borderLeft: `3px solid ${cityAreaMetric === 'price' ? 'var(--color-owner)' : 'var(--color-renter)'}`,
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            pointerEvents: 'none',
            minWidth: '160px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
            {hoveredCityAreaData.label}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{fmtCADShort.format(hoveredCityAreaData.price)}</span>
            {' '}est. price
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{fmtCADShort.format(hoveredCityAreaData.rent)}/mo</span>
            {' '}est. rent
          </div>
        </div>
      )}

      {/* Per-step annotation card */}
      {annotation && (
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '12px',
            zIndex: 10,
            background: 'rgba(15,15,14,0.82)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${annotation.accent}40`,
            borderLeft: `3px solid ${annotation.accent}`,
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            maxWidth: '280px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: annotation.accent, marginBottom: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {annotation.title}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', lineHeight: 1.5 }}>
            {annotation.body}
          </div>
        </div>
      )}

      {/* Map attribution */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '8px',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.28)',
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'none',
          letterSpacing: '0.01em',
        }}
      >
        © CARTO · © OpenStreetMap contributors
      </div>
    </div>
  );
}
