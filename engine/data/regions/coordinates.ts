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

export interface TorontoFSACentroid {
  fsa: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Approximate centroids for Toronto FSAs (M1–M9).
 * Coordinates derived from known neighbourhood geography.
 * Price/rent data comes from suggestPriceAndRent which resolves to borough-level
 * (M1→Scarborough, M2/M3→North York, M4→East, M5→Downtown, M6→West, M8/M9→Etobicoke).
 */
export const TORONTO_FSA_CENTROIDS: TorontoFSACentroid[] = [
  // Downtown (M5)
  { fsa: 'M5V', name: 'Downtown Core',      lat: 43.643, lng: -79.387 },
  { fsa: 'M5A', name: 'Distillery',         lat: 43.651, lng: -79.356 },
  { fsa: 'M5J', name: 'Harbourfront',       lat: 43.640, lng: -79.381 },
  { fsa: 'M5S', name: 'Annex / U of T',     lat: 43.664, lng: -79.398 },
  { fsa: 'M5T', name: 'Kensington',         lat: 43.653, lng: -79.401 },
  { fsa: 'M5R', name: 'Casa Loma',          lat: 43.676, lng: -79.404 },
  { fsa: 'M5P', name: 'Forest Hill S.',     lat: 43.696, lng: -79.412 },
  { fsa: 'M5N', name: 'Lawrence Park N.',   lat: 43.710, lng: -79.401 },
  { fsa: 'M5M', name: 'Avenue / Lawrence',  lat: 43.724, lng: -79.406 },
  { fsa: 'M5G', name: 'Discovery District', lat: 43.657, lng: -79.388 },
  { fsa: 'M5B', name: 'Garden District',    lat: 43.657, lng: -79.375 },
  { fsa: 'M5C', name: 'St. Lawrence',       lat: 43.648, lng: -79.372 },
  { fsa: 'M5E', name: 'Harbourfront E.',    lat: 43.643, lng: -79.367 },
  { fsa: 'M5H', name: 'Financial District', lat: 43.649, lng: -79.380 },
  { fsa: 'M5K', name: 'Union / Front',      lat: 43.646, lng: -79.376 },
  { fsa: 'M5W', name: 'Bay / Bloor',        lat: 43.668, lng: -79.388 },
  { fsa: 'M5X', name: 'Commerce Court',     lat: 43.647, lng: -79.382 },
  { fsa: 'M7A', name: "Queen's Park",       lat: 43.664, lng: -79.390 },
  // West End (M6)
  { fsa: 'M6G', name: 'Palmerston',         lat: 43.660, lng: -79.424 },
  { fsa: 'M6H', name: 'Dovercourt',         lat: 43.667, lng: -79.437 },
  { fsa: 'M6J', name: 'Trinity-Bellwoods',  lat: 43.647, lng: -79.426 },
  { fsa: 'M6K', name: 'Parkdale',           lat: 43.641, lng: -79.448 },
  { fsa: 'M6P', name: 'Junction',           lat: 43.660, lng: -79.467 },
  { fsa: 'M6R', name: 'Roncesvalles',       lat: 43.647, lng: -79.453 },
  { fsa: 'M6S', name: 'Swansea',            lat: 43.653, lng: -79.479 },
  { fsa: 'M6A', name: 'Lawrence Heights',   lat: 43.719, lng: -79.448 },
  { fsa: 'M6B', name: 'Glencairn',          lat: 43.703, lng: -79.449 },
  { fsa: 'M6C', name: 'Humewood',           lat: 43.693, lng: -79.437 },
  { fsa: 'M6E', name: 'Caledonia',          lat: 43.683, lng: -79.450 },
  { fsa: 'M6L', name: 'North Park',         lat: 43.714, lng: -79.492 },
  { fsa: 'M6M', name: 'Del Ray',            lat: 43.689, lng: -79.476 },
  { fsa: 'M6N', name: 'Junction North',     lat: 43.670, lng: -79.491 },
  // East (M4)
  { fsa: 'M4E', name: 'The Beaches',        lat: 43.675, lng: -79.295 },
  { fsa: 'M4L', name: 'Leslieville',        lat: 43.661, lng: -79.327 },
  { fsa: 'M4M', name: 'South Riverdale',    lat: 43.659, lng: -79.348 },
  { fsa: 'M4K', name: 'Danforth',           lat: 43.678, lng: -79.360 },
  { fsa: 'M4J', name: 'Pape Village',       lat: 43.688, lng: -79.342 },
  { fsa: 'M4G', name: 'Leaside',            lat: 43.705, lng: -79.369 },
  { fsa: 'M4B', name: 'East York',          lat: 43.699, lng: -79.329 },
  { fsa: 'M4C', name: 'Woodbine Heights',   lat: 43.695, lng: -79.309 },
  { fsa: 'M4A', name: 'Victoria Village',   lat: 43.715, lng: -79.310 },
  { fsa: 'M4N', name: 'Lawrence Park',      lat: 43.726, lng: -79.390 },
  { fsa: 'M4P', name: 'Davisville',         lat: 43.707, lng: -79.392 },
  { fsa: 'M4R', name: 'North Toronto',      lat: 43.719, lng: -79.396 },
  { fsa: 'M4S', name: 'Davisville Village', lat: 43.701, lng: -79.381 },
  { fsa: 'M4T', name: 'Moore Park',         lat: 43.685, lng: -79.388 },
  { fsa: 'M4V', name: 'Forest Hill N.',     lat: 43.688, lng: -79.407 },
  { fsa: 'M4W', name: 'Rosedale',           lat: 43.679, lng: -79.381 },
  { fsa: 'M4X', name: 'Cabbagetown',        lat: 43.665, lng: -79.367 },
  { fsa: 'M4Y', name: 'Church-Wellesley',   lat: 43.669, lng: -79.381 },
  // North York (M2 / M3)
  { fsa: 'M2R', name: 'Newtonbrook',        lat: 43.797, lng: -79.439 },
  { fsa: 'M2M', name: 'Willowdale E.',      lat: 43.793, lng: -79.407 },
  { fsa: 'M2N', name: 'Willowdale W.',      lat: 43.769, lng: -79.413 },
  { fsa: 'M2J', name: 'Fairview',           lat: 43.777, lng: -79.349 },
  { fsa: 'M2K', name: 'Bayview Village',    lat: 43.785, lng: -79.384 },
  { fsa: 'M2L', name: 'York Mills',         lat: 43.753, lng: -79.374 },
  { fsa: 'M2P', name: 'York Mills W.',      lat: 43.752, lng: -79.403 },
  { fsa: 'M2H', name: 'Hillcrest Village',  lat: 43.804, lng: -79.355 },
  { fsa: 'M3A', name: 'Parkwoods',          lat: 43.752, lng: -79.323 },
  { fsa: 'M3B', name: 'Don Mills N.',       lat: 43.725, lng: -79.341 },
  { fsa: 'M3C', name: 'Don Mills S.',       lat: 43.725, lng: -79.331 },
  { fsa: 'M3H', name: 'Bathurst Manor',     lat: 43.758, lng: -79.451 },
  { fsa: 'M3J', name: 'Downsview',          lat: 43.761, lng: -79.488 },
  { fsa: 'M3K', name: 'CFB Toronto',        lat: 43.727, lng: -79.466 },
  { fsa: 'M3L', name: 'Downsview N.',       lat: 43.737, lng: -79.502 },
  { fsa: 'M3M', name: 'Black Creek',        lat: 43.717, lng: -79.509 },
  { fsa: 'M3N', name: 'Jane and Finch',     lat: 43.754, lng: -79.521 },
  // Scarborough (M1)
  { fsa: 'M1B', name: 'Rouge Hill',         lat: 43.806, lng: -79.194 },
  { fsa: 'M1C', name: 'Port Union',         lat: 43.782, lng: -79.162 },
  { fsa: 'M1E', name: 'Guildwood',          lat: 43.757, lng: -79.190 },
  { fsa: 'M1G', name: 'Woburn',             lat: 43.770, lng: -79.226 },
  { fsa: 'M1H', name: 'Cedarbrae',          lat: 43.773, lng: -79.240 },
  { fsa: 'M1J', name: 'Scarborough Vil.',   lat: 43.741, lng: -79.240 },
  { fsa: 'M1K', name: 'Kennedy Park',       lat: 43.709, lng: -79.269 },
  { fsa: 'M1L', name: 'Clairlea',           lat: 43.711, lng: -79.298 },
  { fsa: 'M1M', name: 'Cliffcrest',         lat: 43.715, lng: -79.233 },
  { fsa: 'M1N', name: 'Birchcliff',         lat: 43.692, lng: -79.268 },
  { fsa: 'M1P', name: 'Cliffside',          lat: 43.757, lng: -79.250 },
  { fsa: 'M1R', name: 'Wexford',            lat: 43.750, lng: -79.301 },
  { fsa: 'M1S', name: 'Agincourt',          lat: 43.789, lng: -79.274 },
  { fsa: 'M1T', name: 'Clarks Corners',     lat: 43.779, lng: -79.312 },
  { fsa: 'M1V', name: 'Malvern',            lat: 43.815, lng: -79.252 },
  { fsa: 'M1W', name: 'Steeles E.',         lat: 43.799, lng: -79.289 },
  { fsa: 'M1X', name: 'Rouge',              lat: 43.833, lng: -79.206 },
  // Etobicoke (M8 / M9)
  { fsa: 'M8V', name: 'Mimico S.',          lat: 43.602, lng: -79.511 },
  { fsa: 'M8W', name: 'Alderwood',          lat: 43.601, lng: -79.539 },
  { fsa: 'M8X', name: 'Kingsway',           lat: 43.647, lng: -79.514 },
  { fsa: 'M8Y', name: 'Mimico NE',          lat: 43.627, lng: -79.498 },
  { fsa: 'M8Z', name: 'Mimico SW',          lat: 43.616, lng: -79.524 },
  { fsa: 'M9A', name: 'Islington',          lat: 43.644, lng: -79.529 },
  { fsa: 'M9B', name: 'Kingsview Vil.',     lat: 43.650, lng: -79.552 },
  { fsa: 'M9C', name: 'Eringate',           lat: 43.644, lng: -79.576 },
  { fsa: 'M9L', name: 'Humber Summit',      lat: 43.757, lng: -79.547 },
  { fsa: 'M9M', name: 'Humberlea',          lat: 43.729, lng: -79.543 },
  { fsa: 'M9N', name: 'Weston',             lat: 43.706, lng: -79.517 },
  { fsa: 'M9P', name: 'Westmount',          lat: 43.695, lng: -79.529 },
  { fsa: 'M9R', name: 'Kingsview W.',       lat: 43.688, lng: -79.564 },
  { fsa: 'M9V', name: 'Thistletown',        lat: 43.731, lng: -79.605 },
  { fsa: 'M9W', name: 'Rexdale',            lat: 43.706, lng: -79.598 },
];

/** Returns the primary city centroid to fly to for a province (first metro, or province centroid coords with city zoom). */
export function primaryCityForProvince(province: Province): GeoPoint {
  const metros = metrosForProvince(province);
  if (metros.length === 0) return PROVINCE_CENTROIDS[province];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const primary = metros[0]!;
  return { lat: primary.lat, lng: primary.lng, zoom: primary.zoom };
}
