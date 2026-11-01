import * as turf from '@turf/turf';

/**
 * Bounding box for Estado de México (approximate camera bounds):
 * South: 18.35° N, North: 20.35° N, West: -100.62° W, East: -98.55° W
 */
export const EDOMEX_BOUNDS: [[number, number], [number, number]] = [
  [18.35, -100.62], // Southwest [lat, lon]
  [20.35, -98.55],  // Northeast [lat, lon]
];

export const EDOMEX_CENTER: [number, number] = [19.35, -99.65]; // [lat, lon]

/**
 * Key forest municipalities of Estado de México with coordinates [lat, lon]
 */
export interface MunicipalityLocation {
  name: string;
  region: string;
  lat: number;
  lon: number;
  zoom: number;
}

export const EDOMEX_FOREST_MUNICIPALITIES: MunicipalityLocation[] = [
  { name: 'Zinacantepec', region: 'Región VII Valle de Toluca', lat: 19.2833, lon: -99.7333, zoom: 12 },
  { name: 'Valle de Bravo', region: 'Región X Valle de Bravo', lat: 19.1928, lon: -100.1317, zoom: 12 },
  { name: 'Toluca', region: 'Región VII Valle de Toluca', lat: 19.2926, lon: -99.6569, zoom: 12 },
  { name: 'Temascaltepec', region: 'Región IX Tejupilco', lat: 19.0433, lon: -100.0450, zoom: 12 },
  { name: 'Villa del Carbón', region: 'Región IV Cuautitlán Izcalli', lat: 19.7289, lon: -99.4628, zoom: 12 },
  { name: 'Amanalco', region: 'Región X Valle de Bravo', lat: 19.2500, lon: -100.0167, zoom: 12 },
  { name: 'San José del Rincón', region: 'Región II Atlacomulco', lat: 19.6500, lon: -100.1500, zoom: 12 },
  { name: 'Ocuilan', region: 'Región VI Coatepec Harinas', lat: 18.9667, lon: -99.4167, zoom: 12 },
  { name: 'Tenancingo', region: 'Región VI Coatepec Harinas', lat: 18.9600, lon: -99.5900, zoom: 12 },
  { name: 'Amecameca', region: 'Región I Amecameca', lat: 19.1239, lon: -98.7661, zoom: 12 },
  { name: 'Texcoco', region: 'Región XII Texcoco', lat: 19.5133, lon: -98.8833, zoom: 12 },
  { name: 'Ixtapaluca', region: 'Región III Chimalhuacán', lat: 19.3167, lon: -98.8833, zoom: 12 },
  { name: 'Villa Victoria', region: 'Región X Valle de Bravo', lat: 19.4333, lon: -100.0000, zoom: 12 },
  { name: 'Donato Guerra', region: 'Región X Valle de Bravo', lat: 19.3167, lon: -100.1333, zoom: 12 },
  { name: 'Almoloya de Alquisiras', region: 'Región VI Coatepec Harinas', lat: 18.8667, lon: -99.8833, zoom: 12 },
];

/**
 * Simplified territorial polygon of Estado de México (WGS84 [lon, lat])
 * Captures the horseshoe boundary surrounding CDMX.
 */
export const EDOMEX_BOUNDARY_GEOJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: { name: 'Estado de México', code: 'MEX' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-100.25, 20.25],
        [-99.85, 20.35],
        [-99.45, 20.15],
        [-99.20, 20.00],
        [-98.85, 20.10],
        [-98.60, 19.85],
        [-98.55, 19.45],
        [-98.65, 19.10],
        [-98.75, 18.85],
        [-99.00, 18.65],
        [-99.35, 18.55],
        [-99.65, 18.35],
        [-100.25, 18.40],
        [-100.55, 18.65],
        [-100.60, 19.15],
        [-100.45, 19.65],
        [-100.35, 20.00],
        [-100.25, 20.25],
      ],
    ],
  },
};

/**
 * Validates if a [lat, lon] coordinate is within the Estado de México boundaries.
 * Uses both bounding box limits and turf point-in-polygon containment.
 */
export function isPointInsideEdomex(lat: number, lon: number): boolean {
  // 1. Fast bounding box check
  if (
    lat < EDOMEX_BOUNDS[0][0] ||
    lat > EDOMEX_BOUNDS[1][0] ||
    lon < EDOMEX_BOUNDS[0][1] ||
    lon > EDOMEX_BOUNDS[1][1]
  ) {
    return false;
  }

  // 2. Point in polygon check against the authoritative boundary
  try {
    const pt = turf.point([lon, lat]);
    return turf.booleanPointInPolygon(pt, EDOMEX_BOUNDARY_GEOJSON);
  } catch {
    // Fallback to bounding box if turf evaluation fails
    return true;
  }
}

/**
 * Validates that all points in a polygon are within Estado de México
 */
export function isPolygonInsideEdomex(coords: [number, number][]): boolean {
  return coords.every(([lat, lon]) => isPointInsideEdomex(lat, lon));
}

/**
 * Calculates the geodesic surface area in hectares for a series of [lat, lon] points.
 * Standardizes to GeoJSON [lon, lat] for Turf.js.
 */
export function calculatePolygonAreaHa(coords: [number, number][]): number {
  if (coords.length < 3) return 0;

  try {
    const closedCoords = [...coords];
    // Ensure ring is closed
    if (
      closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
    ) {
      closedCoords.push(closedCoords[0]);
    }

    // Convert [lat, lon] to GeoJSON [lon, lat]
    const geoJsonCoords = closedCoords.map(([lat, lon]) => [lon, lat]);
    const poly = turf.polygon([geoJsonCoords]);
    const areaSqM = turf.area(poly);
    return Number((areaSqM / 10000).toFixed(4));
  } catch (err) {
    console.warn('Error calculating geodesic area with Turf:', err);
    return 0;
  }
}

/**
 * Calculates the perimeter in meters for a series of [lat, lon] points.
 */
export function calculatePolygonPerimeterM(coords: [number, number][]): number {
  if (coords.length < 2) return 0;

  try {
    const closedCoords = [...coords];
    if (
      coords.length >= 3 &&
      (closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
        closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1])
    ) {
      closedCoords.push(closedCoords[0]);
    }

    const geoJsonCoords = closedCoords.map(([lat, lon]) => [lon, lat]);
    const line = turf.lineString(geoJsonCoords);
    const lengthKm = turf.length(line, { units: 'kilometers' });
    return Math.round(lengthKm * 1000);
  } catch (err) {
    console.warn('Error calculating perimeter:', err);
    return 0;
  }
}

/**
 * Formats [lat, lon] array into standard GeoJSON Polygon format:
 * { type: "Polygon", coordinates: [[[lon, lat], ...]] }
 */
export function coordsToGeoJSONPolygon(coords: [number, number][]): {
  type: 'Polygon';
  coordinates: number[][][];
} {
  if (coords.length < 3) {
    throw new Error('Un polígono válido requiere al menos 3 vértices');
  }

  const ring = coords.map(([lat, lon]) => [lon, lat]);
  // Ensure closed ring
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([ring[0][0], ring[0][1]]);
  }

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

/**
 * Checks for self-intersections in the polygon
 */
export function hasSelfIntersections(coords: [number, number][]): boolean {
  if (coords.length < 4) return false;
  try {
    const ring = coords.map(([lat, lon]) => [lon, lat]);
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
      ring.push([ring[0][0], ring[0][1]]);
    }
    const poly = turf.polygon([ring]);
    const kinks = turf.kinks(poly);
    return kinks.features.length > 0;
  } catch {
    return false;
  }
}
