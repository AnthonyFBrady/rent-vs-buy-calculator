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
import { TorontoFSALayer, type FSAData } from './layers/TorontoFSALayer';
import { BED_PRICE_MULT, BED_RENT_MULT } from '../steps/StepHomeCompare';

// CartoDB Positron — clean light base, pairs with the light UI
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Approximate bounding boxes per province [SW, NE] in [lng, lat].
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

// The left step card is lg:left-4 (16px) lg:w-[400px] = 416px from the map edge.
// All camera ops use asymmetric padding so the selection is centered in the visible strip.
const MAP_PAD = { top: 60, bottom: 60, right: 60, left: 432 } as const;
const MAP_PAD_CITY = { top: 40, bottom: 40, right: 40, left: 432 } as const;

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
  onAdvance?: () => void;
  pendingSelection?: MapPending;
  onPendingSelect?: (pending: MapPending) => void;
  homeCompareBuyConfirmed?: boolean;
}

export function MapPanel({ step, inputs, onPatch, onAdvance, pendingSelection, onPendingSelect, homeCompareBuyConfirmed }: Props) {
  const mapRef = useRef<MapRef>(null);
  const prevStepRef = useRef(step);
  const { viewState, markers, mode, label, interactive, annotation, selectionCenter } = useMapState(step, inputs);

  const isProvinceMode = mode === 'province';

  const isToronto = !!(inputs.postalCode?.toUpperCase().startsWith('M'));
  const showCityAreaLayer = isToronto && CITY_AREA_STEPS.has(step);

  const cityAreaMetric: 'price' | 'rent' =
    step === STEP.RENT ? 'rent' :
    step === STEP.HOME_COMPARE && homeCompareBuyConfirmed ? 'rent' :
    'price';

  const effectiveMode = (step === STEP.HOME_COMPARE && !homeCompareBuyConfirmed) ? 'city-prices' : mode;

  const buyBedMult  = BED_PRICE_MULT[inputs.buyBedrooms  ?? 2] ?? 1;
  const rentBedMult = BED_RENT_MULT[ inputs.rentBedrooms ?? inputs.buyBedrooms ?? 2] ?? 1;

  // Province hover state
  const [hoveredProvinceCode, setHoveredProvinceCode] = useState<Province | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // City borough hover state
  const [hoveredCityAreaId, setHoveredCityAreaId] = useState<string | null>(null);
  const [hoveredCityAreaData, setHoveredCityAreaData] = useState<CityAreaData | null>(null);
  const [cityAreaHoverPoint, setCityAreaHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // Toronto FSA hover state
  const [hoveredFSA, setHoveredFSA] = useState<string | null>(null);
  const [hoveredFSAData, setHoveredFSAData] = useState<FSAData | null>(null);
  const [fsaHoverPoint, setFsaHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // Compute province bounds, used in both the step-change effect and resize handler.
  const getProvinceBounds = useCallback((): [[number, number], [number, number]] => {
    return (PROVINCE_BOUNDS[inputs.province] as [[number, number], [number, number]]) ?? CANADA_BOUNDS;
  }, [inputs.province]);

  // Main camera effect — runs when step, province, or viewState changes.
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;
    const rawMap = ref.getMap();

    // Detect backward navigation for longer zoom-out animation
    const isGoingBack = step < prevStepRef.current;
    prevStepRef.current = step;
    const fitDuration  = isGoingBack ? 2600 : 2000;
    const flyDuration  = isGoingBack ? 2600 : 2200;

    // Set maxBounds before any camera move to prevent escape.
    let bounds: [[number, number], [number, number]] | null = null;
    if (step <= STEP.CITY) {
      bounds = CANADA_BOUNDS;
    } else if (showCityAreaLayer) {
      bounds = GTA_BOUNDS;
    } else if (selectionCenter) {
      const { lat, lng, radiusKm } = selectionCenter;
      const latPad = (radiusKm / 111.32) * 2.2;
      const lngPad = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * 2.2;
      bounds = [[lng - lngPad, lat - latPad], [lng + lngPad, lat + latPad]];
    } else {
      bounds = getProvinceBounds();
    }
    rawMap?.setMaxBounds(bounds);

    // Province step OR entering city step with no city selected: show entire province.
    if (isProvinceMode || (step === STEP.CITY && !inputs.postalCode)) {
      ref.fitBounds(
        getProvinceBounds(),
        { padding: MAP_PAD, duration: fitDuration, essential: true, easing: easeInOutQuad },
      );
      return;
    }

    ref.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      padding: MAP_PAD_CITY,
      duration: flyDuration,
      essential: true,
      easing: easeInOutQuad,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState.longitude, viewState.latitude, viewState.zoom, step, selectionCenter, inputs.province, showCityAreaLayer, inputs.postalCode, isProvinceMode]);

  const handleProvinceClick = useCallback(
    (province: Province) => {
      if (!interactive) return;
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

  // Clear city area / FSA hover when leaving choropleth steps
  useEffect(() => {
    if (!showCityAreaLayer) {
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
      setHoveredFSA(null);
      setHoveredFSAData(null);
      setFsaHoverPoint(null);
    }
  }, [showCityAreaLayer]);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.layer?.id === 'toronto-fsa-fill') {
      const fsa = feature.properties?.fsa as string | undefined;
      setHoveredFSA(fsa ?? null);
      setFsaHoverPoint({ x: e.point.x, y: e.point.y });
      if (fsa) {
        setHoveredFSAData({
          fsa,
          name: feature.properties?.name as string ?? fsa,
          price: feature.properties?.price as number ?? 0,
          rent: feature.properties?.rent as number ?? 0,
        });
      }
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
      setHoveredProvinceCode(null);
      setHoverPoint(null);
    } else if (feature?.layer?.id === 'city-area-fill') {
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
      setHoveredFSA(null);
      setHoveredFSAData(null);
      setFsaHoverPoint(null);
      setHoveredProvinceCode(null);
      setHoverPoint(null);
    } else if (feature?.layer?.id === 'province-choropleth-fill') {
      const code = feature.properties?.code as Province | undefined;
      setHoveredProvinceCode(code || null);
      setHoverPoint({ x: e.point.x, y: e.point.y });
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
      setHoveredFSA(null);
      setHoveredFSAData(null);
      setFsaHoverPoint(null);
    } else {
      setHoveredProvinceCode(null);
      setHoverPoint(null);
      setHoveredCityAreaId(null);
      setHoveredCityAreaData(null);
      setCityAreaHoverPoint(null);
      setHoveredFSA(null);
      setHoveredFSAData(null);
      setFsaHoverPoint(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredProvinceCode(null);
    setHoverPoint(null);
    setHoveredCityAreaId(null);
    setHoveredCityAreaData(null);
    setCityAreaHoverPoint(null);
    setHoveredFSA(null);
    setHoveredFSAData(null);
    setFsaHoverPoint(null);
  }, []);

  // Re-fit on map container resize so the view stays correct at any window size.
  const handleMapResize = useCallback(() => {
    const ref = mapRef.current;
    if (!ref) return;
    if (isProvinceMode || (step === STEP.CITY && !inputs.postalCode)) {
      ref.fitBounds(getProvinceBounds(), { padding: MAP_PAD, duration: 0 });
    } else if (showCityAreaLayer) {
      ref.fitBounds(GTA_BOUNDS, { padding: MAP_PAD_CITY, duration: 0 });
    } else {
      ref.flyTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        padding: MAP_PAD_CITY,
        duration: 0,
      });
    }
  }, [isProvinceMode, step, inputs.postalCode, showCityAreaLayer, getProvinceBounds, viewState]);

  const provinceMarkers = markers.filter(m => m.type === 'province') as import('./useMapState').ProvinceMarker[];
  const metroMarkers    = markers.filter(m => m.type === 'metro')    as import('./useMapState').MetroMarker[];

  const showChoropleth = !showCityAreaLayer && (isProvinceMode || mode === 'city-prices' || mode === 'city-rent-signal' || mode === 'stable');

  const hoveredMetric = hoveredProvinceCode ? PROVINCE_METRICS.get(hoveredProvinceCode) : null;

  const interactiveLayerIds = [
    ...(isProvinceMode    ? ['province-choropleth-fill'] : []),
    ...(showCityAreaLayer ? ['city-area-fill', 'toronto-fsa-fill'] : []),
  ];

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
        interactiveLayerIds={interactiveLayerIds}
        onClick={isProvinceMode ? handleMapClick : undefined}
        onMouseMove={isProvinceMode || showCityAreaLayer ? handleMouseMove : undefined}
        onMouseLeave={isProvinceMode || showCityAreaLayer ? handleMouseLeave : undefined}
        onResize={handleMapResize}
        cursor={
          (isProvinceMode && hoveredProvinceCode) ||
          (showCityAreaLayer && (hoveredCityAreaId || hoveredFSA))
            ? 'pointer'
            : 'grab'
        }
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {showChoropleth && (
          <ProvinceChoroplethLayer
            selectedProvince={inputs.province}
            hoveredCode={hoveredProvinceCode}
            contextOnly={!isProvinceMode}
          />
        )}

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

        {selectionCenter && !showCityAreaLayer && (
          <SelectedAreaLayer
            lat={selectionCenter.lat}
            lng={selectionCenter.lng}
            radiusKm={selectionCenter.radiusKm}
          />
        )}

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

        {/* FSA-level bubbles appear at zoom ≥ 11.5, on top of the borough choropleth */}
        {showCityAreaLayer && (
          <TorontoFSALayer
            metric={cityAreaMetric}
            homeType={inputs.homeType ?? 'condo-apt'}
            buyBedMult={buyBedMult}
            rentBedMult={rentBedMult}
            hoveredFSA={hoveredFSA}
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
      {showCityAreaLayer && cityAreaHoverPoint && hoveredCityAreaData && !hoveredFSA && (
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

      {/* Toronto FSA hover tooltip — shown at higher zoom when hovering FSA bubbles */}
      {showCityAreaLayer && fsaHoverPoint && hoveredFSAData && (
        <div
          style={{
            position: 'absolute',
            left: fsaHoverPoint.x + 14,
            top: Math.max(8, fsaHoverPoint.y - 80),
            zIndex: 21,
            background: 'rgba(15,15,14,0.88)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${cityAreaMetric === 'price' ? 'rgba(245,158,11,0.40)' : 'rgba(20,184,166,0.40)'}`,
            borderLeft: `3px solid ${cityAreaMetric === 'price' ? '#F59E0B' : '#14B8A6'}`,
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            padding: '10px 14px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            pointerEvents: 'none',
            minWidth: '160px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            {hoveredFSAData.fsa}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
            {hoveredFSAData.name}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{fmtCADShort.format(hoveredFSAData.price)}</span>
            {' '}est. price
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.60)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{fmtCADShort.format(hoveredFSAData.rent)}/mo</span>
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
