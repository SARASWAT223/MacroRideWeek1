/**
 * spatial.js – Macro Rides Spatial Utilities
 * ─────────────────────────────────────────────────────────────
 * Handles:
 *  • H3 geospatial indexing (resolution 9 ≈ 174m edge length)
 *  • Turf.js 350m buffer corridor generation around a route
 *  • Point-in-corridor eligibility checks
 *  • Zone boundary polygon helpers
 *
 * Note: h3, turf, and L are loaded as CDN UMD globals (window.h3, etc.)
 * and are accessible in ES module context via the global scope.
 */

// H3 resolution: 9 → avg hexagon edge ~174m (covers ~350m buffer well)
export const H3_RESOLUTION = 9;
export const CORRIDOR_RADIUS_M = 350;

/**
 * Build a 350m buffer polygon around a LineString route.
 * Uses Turf.js buffer with kilometers unit conversion.
 *
 * @param {Array<[number,number]>} routeCoords – [[lng,lat], ...]
 * @returns {GeoJSON Feature<Polygon>}
 */
export function buildCorridorBuffer(routeCoords) {
  const line = turf.lineString(routeCoords);
  const buffered = turf.buffer(line, CORRIDOR_RADIUS_M / 1000, { units: 'kilometers', steps: 32 });
  return buffered;
}

/**
 * Check if a lat/lng point is inside a GeoJSON polygon feature.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {GeoJSON Feature<Polygon>} corridorPolygon
 * @returns {boolean}
 */
export function isPointInCorridor(lat, lng, corridorPolygon) {
  if (!corridorPolygon) return false;
  const pt = turf.point([lng, lat]);
  return turf.booleanPointInPolygon(pt, corridorPolygon);
}

/**
 * Get the H3 cell index for a given lat/lng at the configured resolution.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {string} H3 index
 */
export function getH3Index(lat, lng) {
  // h3-js v4: latLngToCell; v3: geoToH3
  const fn = h3.latLngToCell || h3.geoToH3;
  return fn(lat, lng, H3_RESOLUTION);
}

/**
 * Get all H3 cells that cover a GeoJSON Polygon feature.
 * Uses h3.polygonToCells for accurate coverage.
 * Supports both h3-js v3 and v4 API shapes.
 *
 * @param {GeoJSON Feature<Polygon>} polygonFeature
 * @returns {string[]} Array of H3 cell indices
 */
export function getCellsForPolygon(polygonFeature) {
  const coords = polygonFeature.geometry.coordinates[0];
  // h3 v4 expects [lat, lng] pairs in the polygon format
  const latLngs = coords.map(([lng, lat]) => [lat, lng]);

  // Try h3-js v4 API first (polygonToCells with GeoJSON-like object)
  if (typeof h3.polygonToCells === 'function') {
    try {
      // v4: polygonToCells({ outer: [[lat,lng],...] }, res)
      return h3.polygonToCells({ outer: latLngs }, H3_RESOLUTION);
    } catch (e) {
      // v3 fallback: polyfill([lat,lng][], res)
      return h3.polyfill(latLngs, H3_RESOLUTION);
    }
  }
  // v3 fallback
  return h3.polyfill(latLngs, H3_RESOLUTION);
}

/**
 * Convert H3 cell index to a Leaflet-compatible polygon boundary.
 *
 * @param {string} h3Index
 * @returns {Array<[number,number]>} [[lat,lng], ...] for L.polygon
 */
export function h3CellToLeafletBoundary(h3Index) {
  // h3-js v4: cellToBoundary; v3: h3ToGeoBoundary
  const fn = h3.cellToBoundary || h3.h3ToGeoBoundary;
  const boundary = fn(h3Index); // returns [[lat,lng], ...]
  return boundary;
}

/**
 * Fast eligibility check: does this pickup's H3 cell overlap
 * with the set of H3 cells covering the corridor?
 *
 * @param {string} pickupH3   – H3 index of the pickup point
 * @param {Set<string>} corridorCellSet – Set of H3 indices in corridor
 * @returns {boolean}
 */
export function isH3EligibleByCell(pickupH3, corridorCellSet) {
  // Also check neighboring cells (k=1 ring) for edge proximity
  // h3-js v4: gridDisk; v3: kRing
  const diskFn = h3.gridDisk || h3.kRing;
  const neighbors = diskFn(pickupH3, 1);
  return neighbors.some(cell => corridorCellSet.has(cell));
}

/**
 * Compute the H3 cell set for the corridor polygon.
 * Returns a Set for O(1) lookup.
 *
 * @param {GeoJSON Feature<Polygon>} corridorPolygon
 * @returns {Set<string>}
 */
export function buildCorridorCellSet(corridorPolygon) {
  try {
    const cells = getCellsForPolygon(corridorPolygon);
    return new Set(cells);
  } catch (err) {
    console.warn('[Macro Rides] H3 cell indexing failed, falling back to empty set:', err);
    return new Set();
  }
}

/**
 * Generate a zone boundary polygon (convex hull + padding) for the
 * operating area, given the pickup points and route.
 *
 * @param {Array<{lat:number,lng:number}>} pickupPoints
 * @param {Array<[number,number]>} routeCoords – [[lng,lat], ...]
 * @returns {GeoJSON Feature<Polygon>}
 */
export function buildZoneBoundary(pickupPoints, routeCoords) {
  const allPoints = [
    ...pickupPoints.map(p => turf.point([p.lng, p.lat])),
    ...routeCoords.map(([lng, lat]) => turf.point([lng, lat])),
  ];
  const collection = turf.featureCollection(allPoints);
  const hull = turf.convex(collection);
  if (!hull) return null;
  // Expand zone boundary by 600m
  return turf.buffer(hull, 0.6, { units: 'kilometers', steps: 24 });
}

/**
 * Calculate the total route length in meters.
 *
 * @param {Array<[number,number]>} routeCoords – [[lng,lat], ...]
 * @returns {number} meters
 */
export function routeLengthMeters(routeCoords) {
  const line = turf.lineString(routeCoords);
  return turf.length(line, { units: 'kilometers' }) * 1000;
}

/**
 * Interpolate a position along a route given a fraction (0-1).
 *
 * @param {Array<[number,number]>} routeCoords – [[lng,lat], ...]
 * @param {number} fraction – 0 = start, 1 = end
 * @returns {{ lat: number, lng: number }}
 */
export function interpolateAlongRoute(routeCoords, fraction) {
  const line = turf.lineString(routeCoords);
  const totalKm = turf.length(line, { units: 'kilometers' });
  const targetKm = fraction * totalKm;
  const pt = turf.along(line, targetKm, { units: 'kilometers' });
  return { lat: pt.geometry.coordinates[1], lng: pt.geometry.coordinates[0] };
}
