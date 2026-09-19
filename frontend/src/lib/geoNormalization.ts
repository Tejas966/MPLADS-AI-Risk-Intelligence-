/**
 * Geographic Normalization Utilities for Vanguard MPLADS Risk Intelligence
 * Provides verified mapping between backend state/district database entries
 * and official DataMeet administrative boundary GeoJSON features.
 */

export interface StateGeoFeatureProps {
  ST_NM: string;
}

export interface DistrictGeoFeatureProps {
  district: string;
  state: string;
  dist_code?: string;
}

// Canonical state mapping dictionary
const STATE_ALIASES: Record<string, string> = {
  "jammu and kashmir": "Jammu & Kashmir",
  "jammu & kashmir": "Jammu & Kashmir",
  "andaman and nicobar islands": "Andaman & Nicobar",
  "andaman & nicobar": "Andaman & Nicobar",
  "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  "delhi": "Delhi",
  "nct of delhi": "Delhi",
  "telangana": "Telangana",
  "orissa": "Odisha",
  "odisha": "Odisha",
  "uttaranchal": "Uttarakhand",
  "uttarakhand": "Uttarakhand",
  "pondicherry": "Puducherry",
  "puducherry": "Puducherry",
};

/**
 * Normalizes any state string variation to the exact ST_NM used in india_states.geojson
 */
export function normalizeStateName(state: string | null | undefined): string {
  if (!state) return "";
  const clean = state.trim();
  const lower = clean.toLowerCase();
  
  if (STATE_ALIASES[lower]) {
    return STATE_ALIASES[lower];
  }
  
  // Title-case standard matching
  return clean
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Returns the URL/path to the state's district GeoJSON file
 */
export function getStateDistrictFile(stateName: string): string {
  const norm = stateName.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `/data/districts/${norm}.json`;
}

/**
 * Normalizes a district string for robust comparison against GeoJSON properties.
 * Strips punctuation, extra spaces, and common prefixes/suffixes.
 */
export function normalizeDistrictName(dist: string | null | undefined): string {
  if (!dist) return "";
  return dist
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/DISTRICT/g, "")
    .replace(/MAGISTRATE/g, "")
    .trim();
}
