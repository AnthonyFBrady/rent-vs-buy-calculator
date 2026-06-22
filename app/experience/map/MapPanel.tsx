'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Map, { NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { CalculatorInputs, Province } from '@/engine';
import { defaultInputsFor, suggestPriceAndRent } from '@/engine';
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

// CartoDB Dark Matter — clean dark base with subtle roads, no busy POI clutter
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

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

// Steps that show the Toronto borough choropleth
const CITY_AREA_STEPS = new Set<number>([STEP.HOME_COMPARE, STEP.HOME_PRICE, STEP.RENT]);

const fmtCADShort = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

interface Props {
  step: number;
  inputs: CalculatorInputs;
  onPatch: (p: Partial<CalculatorInputs>) => void;
  /** Called after a province or city is selected via map tap — auto-advances the step. */
  onAdvance?: () => void;
}

export function MapPanel({ step, inputs, onPatch, onAdvance }: Props) {
  const mapRef = useRef<MapRef>(null);
  const { viewState, markers, mode, label, interactive, annotation, selectionCenter } = useMapState(step, inputs);

  const isProvinceMode = mode === 'province';

  // Whether the selected city is Toronto (postalCode starts with 'M')
  const isToronto = !!(inputs.postalCode?.toUpperCase().startsWith('M'));
  // Show the borough choropleth on these steps when in Toronto
  const showCityAreaLayer = isToronto && CITY_AREA_STEPS.has(step);

  // Choropleth metric: price on buy-compare or home-price steps, rent on rent step or after buy answered
  const buyAnswered = inputs.homeType !== undefined && inputs.buyBedrooms !== undefined;
  const cityAreaMetric: 'price' | 'rent' =
    step === STEP.RENT ? 'rent' :
    step === STEP.HOME_COMPARE && buyAnswered ? 'rent' :
    'price';

  const buyBedMult  = BED_PRICE_MULT[inputs.buyBedrooms  ?? 2] ?? 1;
  const rentBedMult = BED_RENT_MULT[ inputs.rentBedrooms ?? inputs.buyBedrooms ?? 2] ?? 1;

  // Province hover state — used for choropleth tooltip
  const [hoveredProvinceCode, setHoveredProvinceCode] = useState<Province | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);

  // City area hover state — used for borough choropleth tooltip
  const [hoveredCityAreaId, setHoveredCityAreaId] = useState<string | null>(null);
  const [hoveredCityAreaData, setHoveredCityAreaData] = useState<CityAreaData | null>(null);
  const [cityAreaHoverPoint, setCityAreaHoverPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      duration: 1000,
      essential: true,
      easing: easeInOutQuad,
    });
  }, [viewState.longitude, viewState.latitude, viewState.zoom]);

  const handleProvinceClick = useCallback(
    (province: Province) => {
      if (!interactive) return;
      const next = defaultInputsFor(province);
      onPatch({
        province,
        postalCode: undefined,
        propertyTaxPct: next.propertyTaxPct,
        rentControlCapPct: next.rentControlCapPct,
        marginalTaxRatePct: next.marginalTaxRatePct,
        isTorontoMunicipalLTT: false,
      });
      // Map tap is a decisive action — advance immediately to city selection
      onAdvance?.();
    },
    [interactive, onPatch, onAdvance],
  );

  const handleCityMarkerClick = useCallback(
    (marker: MetroMarker) => {
      const homeType = inputs.homeType ?? 'condo-apt';
      const suggestion = suggestPriceAndRent(marker.id, homeType);
      const provDefaults = defaultInputsFor(inputs.province);
      onPatch({
        postalCode: marker.id,
        isTorontoMunicipalLTT: false,
        propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
        ...(suggestion ? {
          homePrice: suggestion.medianPrice,
          monthlyRent: Math.round(suggestion.suggestedMonthlyRent),
        } : {}),
      });
      // Map tap is decisive — advance to HOME_COMPARE
      onAdvance?.();
    },
    [inputs.homeType, inputs.province, onPatch, onAdvance],
  );

  // Restrict pan/zoom bounds after province → city → borough drill-in
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    let bounds: [[number, number], [number, number]] | null = null;

    if (showCityAreaLayer) {
      // Toronto choropleth steps — use GTA-wide bounds so all 6 boroughs are pannable
      bounds = GTA_BOUNDS;
    } else if (step > STEP.CITY && selectionCenter) {
      // City selected — derive bounds from the selection radius with generous padding
      const { lat, lng, radiusKm } = selectionCenter;
      const latPad = (radiusKm / 111.32) * 2.2;
      const lngPad = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * 2.2;
      bounds = [[lng - lngPad, lat - latPad], [lng + lngPad, lat + latPad]];
    } else if (step > STEP.PROVINCE) {
      // Province selected — restrict to province bounding box
      bounds = (PROVINCE_BOUNDS[inputs.province] as [[number, number], [number, number]]) ?? null;
    }

    map.setMaxBounds(bounds ?? null);
  }, [selectionCenter, step, inputs.province]);

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
            background: 'rgba(15,15,17,0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '9999px',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(250,250,250,0.8)',
            letterSpacing: '-0.01em',
            fontFamily: 'system-ui, sans-serif',
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
        onMouseMove={isProvinceMode || showCityAreaLayer ? handleMouseMove : undefined}
        onMouseLeave={isProvinceMode || showCityAreaLayer ? handleMouseLeave : undefined}
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

        {mode === 'city-prices' && !showCityAreaLayer && (
          <PriceMarkerLayer
            markers={metroMarkers}
            onCityClick={step === STEP.CITY ? handleCityMarkerClick : undefined}
          />
        )}

        {(mode === 'city-rent-signal' || mode === 'stable') && !showCityAreaLayer && (
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
            background: 'rgba(12,12,14,0.93)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${VERDICT_COLOR[hoveredMetric.verdict] ?? '#555'}40`,
            borderLeft: `3px solid ${VERDICT_COLOR[hoveredMetric.verdict] ?? '#555'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            minWidth: '170px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#FAFAFA', marginBottom: '6px', letterSpacing: '-0.01em' }}>
            {hoveredMetric.label}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(250,250,250,0.6)', lineHeight: 1.7 }}>
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>{fmtChoroplethCAD.format(hoveredMetric.medianPrice)}</span>
            {' '}median (condo)
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(250,250,250,0.6)', lineHeight: 1.7 }}>
            <span style={{ color: 'rgba(250,250,250,0.85)' }}>{fmtChoroplethCAD.format(hoveredMetric.monthlyRent)}/mo</span>
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
            background: 'rgba(12,12,14,0.93)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${cityAreaMetric === 'price' ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'}`,
            borderLeft: `3px solid ${cityAreaMetric === 'price' ? '#F59E0B' : '#10B981'}`,
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            minWidth: '160px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#FAFAFA', marginBottom: '6px', letterSpacing: '-0.01em' }}>
            {hoveredCityAreaData.label}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(250,250,250,0.6)', lineHeight: 1.7 }}>
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>{fmtCADShort.format(hoveredCityAreaData.price)}</span>
            {' '}est. price
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(250,250,250,0.6)', lineHeight: 1.7 }}>
            <span style={{ color: '#10B981', fontWeight: 600 }}>{fmtCADShort.format(hoveredCityAreaData.rent)}/mo</span>
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
            background: 'rgba(12,12,14,0.90)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${annotation.accent}40`,
            borderLeft: `3px solid ${annotation.accent}`,
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '280px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: annotation.accent, marginBottom: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {annotation.title}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(250,250,250,0.88)', lineHeight: 1.5 }}>
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
