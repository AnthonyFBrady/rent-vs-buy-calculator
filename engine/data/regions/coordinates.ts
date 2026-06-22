// Geographic centroids for provinces and metro areas.
// Used by the map panel to set the camera target per step.
// No coordinates existed in the engine before this file.

import type { Province } from '../../types';

export interface GeoPoint {
  lat: number;
  lng: number;
  zoom: number;
}

export const PROVINCE_CENTROIDS: Record<Province, GeoPoint> = {
  ON: { lat: 49.5,  lng: -85.0,   zoom: 5 },
  BC: { lat: 53.7,  lng: -127.7,  zoom: 5 },
  AB: { lat: 54.5,  lng: -115.0,  zoom: 5 },
  QC: { lat: 53.0,  lng: -70.0,   zoom: 5 },
  MB: { lat: 55.0,  lng: -97.0,   zoom: 5 },
  SK: { lat: 54.0,  lng: -106.0,  zoom: 5 },
  NS: { lat: 45.0,  lng: -63.0,   zoom: 6 },
  NB: { lat: 46.5,  lng: -66.5,   zoom: 6 },
  NL: { lat: 53.0,  lng: -60.0,   zoom: 5 },
  PE: { lat: 46.4,  lng: -63.2,   zoom: 7 },
};

export interface MetroCentroid extends GeoPoint {
  /** Matches the `name` field in postalCode.ts MetroProfile entries. */
  metro: string;
  province: Province;
  /**
   * FSA used to query suggestPriceAndRent for this metro.
   * May be a 2-char prefix (e.g. 'M5') or a 3-char FSA (e.g. 'V9R') for
   * metros whose 2-char prefix spans multiple cities.
   */
  fsa: string;
}

export const METRO_CENTROIDS: MetroCentroid[] = [
  // Ontario
  { metro: 'Toronto',                 province: 'ON', fsa: 'M5V', lat: 43.65,  lng: -79.38,  zoom: 11 },
  { metro: 'Ottawa',                  province: 'ON', fsa: 'K1A', lat: 45.42,  lng: -75.69,  zoom: 11 },
  { metro: 'Hamilton',                province: 'ON', fsa: 'L8N', lat: 43.26,  lng: -79.87,  zoom: 12 },
  { metro: 'Mississauga',             province: 'ON', fsa: 'L5B', lat: 43.59,  lng: -79.64,  zoom: 12 },
  { metro: 'Kitchener',               province: 'ON', fsa: 'N2H', lat: 43.45,  lng: -80.49,  zoom: 12 },
  { metro: 'London',                  province: 'ON', fsa: 'N6A', lat: 42.98,  lng: -81.24,  zoom: 12 },
  { metro: 'Barrie',                  province: 'ON', fsa: 'L4M', lat: 44.39,  lng: -79.69,  zoom: 12 },
  { metro: 'Guelph',                  province: 'ON', fsa: 'N1H', lat: 43.54,  lng: -80.25,  zoom: 12 },
  { metro: 'Oshawa / Durham',         province: 'ON', fsa: 'L1H', lat: 43.90,  lng: -78.86,  zoom: 12 },
  { metro: 'St. Catharines / Niagara',province: 'ON', fsa: 'L2R', lat: 43.16,  lng: -79.24,  zoom: 12 },
  { metro: 'Peterborough',            province: 'ON', fsa: 'K9H', lat: 44.30,  lng: -78.32,  zoom: 12 },
  { metro: 'Sudbury',                 province: 'ON', fsa: 'P3A', lat: 46.49,  lng: -81.00,  zoom: 12 },
  { metro: 'Thunder Bay',             province: 'ON', fsa: 'P7B', lat: 48.38,  lng: -89.25,  zoom: 12 },
  // British Columbia
  { metro: 'Vancouver',               province: 'BC', fsa: 'V6B', lat: 49.28,  lng: -123.12, zoom: 11 },
  { metro: 'Kelowna',                 province: 'BC', fsa: 'V1Y', lat: 49.89,  lng: -119.49, zoom: 12 },
  { metro: 'Abbotsford / Mission',    province: 'BC', fsa: 'V2S', lat: 49.05,  lng: -122.33, zoom: 12 },
  { metro: 'Chilliwack',              province: 'BC', fsa: 'V2P', lat: 49.16,  lng: -121.95, zoom: 12 },
  { metro: 'Kamloops',                province: 'BC', fsa: 'V2C', lat: 50.67,  lng: -120.33, zoom: 12 },
  { metro: 'Nanaimo',                 province: 'BC', fsa: 'V9R', lat: 49.16,  lng: -123.94, zoom: 12 },
  { metro: 'Victoria',                province: 'BC', fsa: 'V8W', lat: 48.43,  lng: -123.37, zoom: 12 },
  { metro: 'Prince George',           province: 'BC', fsa: 'V2N', lat: 53.92,  lng: -122.75, zoom: 12 },
  // Alberta
  { metro: 'Calgary',                 province: 'AB', fsa: 'T2P', lat: 51.05,  lng: -114.07, zoom: 11 },
  { metro: 'Edmonton',                province: 'AB', fsa: 'T5J', lat: 53.55,  lng: -113.49, zoom: 11 },
  { metro: 'Red Deer',                province: 'AB', fsa: 'T4N', lat: 52.27,  lng: -113.80, zoom: 12 },
  { metro: 'Lethbridge',              province: 'AB', fsa: 'T1J', lat: 49.69,  lng: -112.84, zoom: 12 },
  // Quebec
  { metro: 'Montreal',                province: 'QC', fsa: 'H3B', lat: 45.51,  lng: -73.57,  zoom: 11 },
  { metro: 'Quebec City',             province: 'QC', fsa: 'G1R', lat: 46.81,  lng: -71.21,  zoom: 12 },
  { metro: 'Sherbrooke',              province: 'QC', fsa: 'J1H', lat: 45.40,  lng: -71.89,  zoom: 12 },
  { metro: 'Trois-Rivières',          province: 'QC', fsa: 'G8V', lat: 46.35,  lng: -72.55,  zoom: 12 },
  { metro: 'Saguenay',                province: 'QC', fsa: 'G7H', lat: 48.43,  lng: -71.07,  zoom: 12 },
  // Manitoba
  { metro: 'Winnipeg',                province: 'MB', fsa: 'R3C', lat: 49.90,  lng: -97.14,  zoom: 11 },
  { metro: 'Brandon',                 province: 'MB', fsa: 'R7A', lat: 49.85,  lng: -99.95,  zoom: 12 },
  // Saskatchewan
  { metro: 'Saskatoon',               province: 'SK', fsa: 'S7K', lat: 52.13,  lng: -106.67, zoom: 11 },
  { metro: 'Regina',                  province: 'SK', fsa: 'S4P', lat: 50.45,  lng: -104.62, zoom: 11 },
  { metro: 'Prince Albert',           province: 'SK', fsa: 'S6V', lat: 53.20,  lng: -105.75, zoom: 12 },
  // Nova Scotia
  { metro: 'Halifax',                 province: 'NS', fsa: 'B3H', lat: 44.65,  lng: -63.58,  zoom: 12 },
  { metro: 'Sydney / Cape Breton',    province: 'NS', fsa: 'B1P', lat: 46.14,  lng: -60.19,  zoom: 12 },
  // New Brunswick
  { metro: 'Moncton',                 province: 'NB', fsa: 'E1C', lat: 46.09,  lng: -64.77,  zoom: 12 },
  { metro: 'Saint John',              province: 'NB', fsa: 'E2L', lat: 45.27,  lng: -66.07,  zoom: 12 },
  { metro: 'Fredericton',             province: 'NB', fsa: 'E3B', lat: 45.96,  lng: -66.64,  zoom: 12 },
  // Newfoundland
  { metro: "St. John's",              province: 'NL', fsa: 'A1C', lat: 47.56,  lng: -52.71,  zoom: 12 },
  { metro: 'Corner Brook',            province: 'NL', fsa: 'A2H', lat: 48.95,  lng: -57.93,  zoom: 12 },
  // Prince Edward Island
  { metro: 'Charlottetown',           province: 'PE', fsa: 'C1A', lat: 46.24,  lng: -63.13,  zoom: 13 },
];

/** Returns all metro centroids for a given province. */
export function metrosForProvince(province: Province): MetroCentroid[] {
  return METRO_CENTROIDS.filter(m => m.province === province);
}

/** Returns the primary city centroid to fly to for a province (first metro, or province centroid coords with city zoom). */
export function primaryCityForProvince(province: Province): GeoPoint {
  const metros = metrosForProvince(province);
  if (metros.length === 0) return PROVINCE_CENTROIDS[province];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const primary = metros[0]!;
  return { lat: primary.lat, lng: primary.lng, zoom: primary.zoom };
}
