/**
 * main.js – Macro Rides Application Entry Point
 * ─────────────────────────────────────────────────────────────
 * Orchestrates:
 *  1. Leaflet dark-mode map initialization
 *  2. Route layer rendering (polyline + endpoint pins)
 *  3. 350m Turf.js corridor buffer generation
 *  4. H3 spatial cell overlay (toggleable)
 *  5. Pickup point eligibility evaluation & marker rendering
 *  6. Smooth driver animation with progress trail & camera follow
 *  7. UI bindings (buttons, toggles, speed slider, progress bar)
 *
 * CDN globals available: L (Leaflet), turf (Turf.js), h3 (H3-js)
 */

import {
  buildCorridorBuffer,
  buildCorridorCellSet,
  buildZoneBoundary,
  h3CellToLeafletBoundary,
  interpolateAlongRoute,
  isPointInCorridor,
  routeLengthMeters,
  getH3Index,
} from './spatial.js';

import { ROUTES, DEFAULT_ROUTE } from './routes.js';

import {
  createDriverMarker,
  createPickupMarker,
  createRouteEndpointMarker,
} from './markers.js';

import {
  setStatus,
  updatePickupStats,
  updateH3Count,
  setDriverToast,
  bindLayerToggles,
  bindSpeedSlider,
  setActiveRouteButton,
  getLayerStates,
} from './ui.js';

// ── Application State ─────────────────────────────────────────
const state = {
  map:             null,
  currentRouteId:  DEFAULT_ROUTE,
  isSimulating:    false,
  simulationFrame: null,
  simulationFrac:  0,         // 0–1 progress along the route
  speedMultiplier: 4,
  lastBearing:     0,         // smoothed heading angle
  followDriver:    true,      // camera follow toggle
  layers: {
    zone:        null,
    routeLine:   null,        // full route polyline (dim)
    trailLine:   null,        // animated progress trail
    corridor:    null,
    driver:      null,
    originPin:   null,
    destPin:     null,
  },
  corridorPolygon: null,
  corridorCellSet: null,
  pickupMarkers:   [],        // [{ data, marker, eligible }]
  h3CellLayers:    [],
  routeCoords:     [],        // [[lat,lng], ...] in Leaflet order
};

// ── Map Initialization ─────────────────────────────────────────
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.error('[Macro Rides] #map element not found!');
    return;
  }

  state.map = L.map('map', {
    center: [12.9716, 77.5946],
    zoom: 13,
    zoomControl: true,
    attributionControl: true,
    zoomAnimation: true,
    fadeAnimation: true,
    preferCanvas: false,
  });

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(state.map);

  setStatus('idle', 'Map ready');
  console.log('[Macro Rides] Map initialized ✓');
}

// ── Layer Clearing ─────────────────────────────────────────────
function clearAllLayers() {
  const { layers, map } = state;
  if (!map) return;
  Object.values(layers).forEach(l => { if (l && map.hasLayer(l)) map.removeLayer(l); });
  state.h3CellLayers.forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
  state.h3CellLayers = [];
  state.pickupMarkers = [];
  Object.keys(layers).forEach(k => (layers[k] = null));
}

// ── Route Loading ──────────────────────────────────────────────
function loadRoute(routeId) {
  const route = ROUTES[routeId];
  if (!route) return;

  clearAllLayers();
  stopSimulation();

  state.currentRouteId = routeId;
  state.simulationFrac = 0;
  state.lastBearing    = 0;

  setStatus('active', `Loading ${route.name}…`);
  setActiveRouteButton(routeId);
  resetProgressBar();

  const { map, layers } = state;

  // ── 1. Fly to route ──────────────────────────────────────────
  map.flyTo(route.center, route.zoom, { duration: 0.8, easeLinearity: 0.5 });

  // ── 2. Convert coords to Leaflet [lat,lng] order ─────────────
  state.routeCoords = route.coords.map(([lng, lat]) => [lat, lng]);

  // ── 3. Build 350m Corridor Buffer ────────────────────────────
  const corridorGeoJSON = buildCorridorBuffer(route.coords);
  state.corridorPolygon = corridorGeoJSON;

  // ── 4. Build H3 Cell Set ──────────────────────────────────────
  state.corridorCellSet = buildCorridorCellSet(corridorGeoJSON);
  updateH3Count(state.corridorCellSet.size);

  // ── 5. Zone Boundary ─────────────────────────────────────────
  const zonePoly = buildZoneBoundary(route.pickupPoints, route.coords);
  if (zonePoly) {
    layers.zone = L.geoJSON(zonePoly, {
      style: {
        color:       'rgba(0, 229, 160, 0.35)',
        fillColor:   'rgba(0, 229, 160, 0.06)',
        weight:      2,
        opacity:     0.8,
        fillOpacity: 1,
        dashArray:   '6 6',
        lineCap:     'round',
      },
    }).addTo(map);
  }

  // ── 6. Corridor Buffer Layer ──────────────────────────────────
  layers.corridor = L.geoJSON(corridorGeoJSON, {
    style: {
      color:       'rgba(74,143,255,0.7)',
      fillColor:   'rgba(74,143,255,0.1)',
      weight:      1.5,
      opacity:     0.9,
      fillOpacity: 1,
      dashArray:   '4 4',
    },
  }).addTo(map);

  // ── 7. Full Route Polyline (dim background) ───────────────────
  // Outer glow
  L.polyline(state.routeCoords, {
    color:     'rgba(74,143,255,0.18)',
    weight:    16,
    opacity:   1,
    lineCap:   'round',
    lineJoin:  'round',
  }).addTo(map);

  // Solid route line (dim – shows full planned route)
  layers.routeLine = L.polyline(state.routeCoords, {
    color:     'rgba(74,143,255,0.35)',
    weight:    4,
    opacity:   1,
    lineCap:   'round',
    lineJoin:  'round',
    dashArray: '8 6',
  }).addTo(map);

  // ── 8. Progress trail line (starts empty, grows as driver moves) ──
  layers.trailLine = L.polyline([], {
    color:     '#4A8FFF',
    weight:    5,
    opacity:   1,
    lineCap:   'round',
    lineJoin:  'round',
  }).addTo(map);

  // ── 9. Route Endpoint Pins ────────────────────────────────────
  const startLL = state.routeCoords[0];
  const endLL   = state.routeCoords[state.routeCoords.length - 1];

  layers.originPin = L.marker(startLL, {
    icon: createRouteEndpointMarker('origin'),
    zIndexOffset: 500,
  })
    .bindPopup(`<strong>Origin</strong><br>${route.name}`)
    .addTo(map);

  layers.destPin = L.marker(endLL, {
    icon: createRouteEndpointMarker('destination'),
    zIndexOffset: 500,
  })
    .bindPopup(`<strong>Destination</strong><br>${route.name}`)
    .addTo(map);

  // ── 10. H3 Cell Overlay ───────────────────────────────────────
  renderH3Cells();

  // ── 11. Pickup Points ─────────────────────────────────────────
  renderPickupPoints(route);

  // ── 12. Driver Marker at origin ───────────────────────────────
  layers.driver = L.marker(startLL, {
    icon:         createDriverMarker(0),
    zIndexOffset: 2000,
  }).addTo(map);

  setStatus('idle', `${route.name} – press Start`);
  updatePickupStats(
    state.pickupMarkers.filter(p => p.eligible).length,
    state.pickupMarkers.length
  );
}

// ── H3 Cell Overlay ───────────────────────────────────────────
function renderH3Cells() {
  state.h3CellLayers.forEach(l => state.map.removeLayer(l));
  state.h3CellLayers = [];

  if (!state.corridorCellSet || !getLayerStates().h3) return;

  state.corridorCellSet.forEach(cellIndex => {
    const boundary = h3CellToLeafletBoundary(cellIndex);
    const poly = L.polygon(boundary, {
      color:       'rgba(255,181,71,0.55)',
      fillColor:   'rgba(255,181,71,0.08)',
      weight:      1,
      opacity:     0.7,
      fillOpacity: 1,
    }).addTo(state.map);
    state.h3CellLayers.push(poly);
  });
}

// ── Pickup Points ─────────────────────────────────────────────
function renderPickupPoints(route) {
  const { map, corridorPolygon } = state;
  state.pickupMarkers = [];

  route.pickupPoints.forEach(pt => {
    const eligible = isPointInCorridor(pt.lat, pt.lng, corridorPolygon);
    const h3idx    = getH3Index(pt.lat, pt.lng);

    const marker = L.marker([pt.lat, pt.lng], {
      icon:         createPickupMarker(eligible),
      zIndexOffset: eligible ? 200 : 100,
      title:        pt.name,
    });

    const popupContent = `
      <div style="font-family:'Inter',sans-serif;min-width:160px;">
        <div style="font-weight:700;font-size:13px;color:${eligible ? '#00E5A0' : '#9CA3AF'};margin-bottom:4px;">
          ${eligible ? '✓ Eligible Stop' : '✗ Outside Corridor'}
        </div>
        <div style="font-size:12px;color:#ccc;margin-bottom:6px;">${pt.name}</div>
        <div style="font-size:10px;color:#6B7280;font-family:monospace;">H3: ${h3idx}</div>
        <div style="font-size:10px;color:#6B7280;margin-top:2px;">
          ${pt.lat.toFixed(4)}°N, ${pt.lng.toFixed(4)}°E
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 200 });
    marker.addTo(map);
    state.pickupMarkers.push({ data: pt, marker, eligible });
  });
}

// ─────────────────────────────────────────────────────────────
// ── DRIVER SIMULATION ENGINE ─────────────────────────────────
// ─────────────────────────────────────────────────────────────

const SIM = {
  BASE_SPEED_MPS: 8,   // m/s  ≈ 29 km/h (realistic EV city speed)
  TRAIL_SAMPLE_EVERY: 0.003,  // add trail point every 0.3% of route
  lastTrailFrac: 0,
  totalLength: 0,
  lastTimestamp: null,
  trailLatLngs: [],
};

function startSimulation() {
  if (state.isSimulating) return;
  state.isSimulating = true;

  const route = ROUTES[state.currentRouteId];
  SIM.totalLength    = routeLengthMeters(route.coords);
  SIM.lastTimestamp  = null;
  SIM.lastTrailFrac  = state.simulationFrac;

  // Seed trail with already-traveled coords
  if (state.simulationFrac > 0) {
    rebuildTrail();
  } else {
    SIM.trailLatLngs = [];
    const startLL = state.routeCoords[0];
    SIM.trailLatLngs = [startLL];
    if (state.layers.trailLine) state.layers.trailLine.setLatLngs([]);
  }

  setStatus('active', 'Driver en route…');
  setDriverToast(true, 'Driver EN-042', `${route.name} · Live`);

  state.simulationFrame = requestAnimationFrame(tick);
}

function tick(timestamp) {
  if (!state.isSimulating) return;

  // ── Delta time ────────────────────────────────────────────────
  if (SIM.lastTimestamp === null) SIM.lastTimestamp = timestamp;
  const elapsedSec    = Math.min((timestamp - SIM.lastTimestamp) / 1000, 0.1); // cap at 100ms
  SIM.lastTimestamp   = timestamp;

  const route      = ROUTES[state.currentRouteId];
  const speedMps   = SIM.BASE_SPEED_MPS * state.speedMultiplier;
  const deltaFrac  = (speedMps * elapsedSec) / SIM.totalLength;

  state.simulationFrac = Math.min(state.simulationFrac + deltaFrac, 1);

  // ── Driver Position ───────────────────────────────────────────
  const pos = interpolateAlongRoute(route.coords, state.simulationFrac);

  // ── Bearing (smoothed) ────────────────────────────────────────
  const lookAheadFrac = Math.min(state.simulationFrac + 0.025, 1);
  const ahead = interpolateAlongRoute(route.coords, lookAheadFrac);
  const rawBearing = computeBearing(pos.lat, pos.lng, ahead.lat, ahead.lng);
  // Smooth heading with exponential interpolation
  state.lastBearing = lerpAngle(state.lastBearing, rawBearing, 0.2);

  // ── Move driver marker ────────────────────────────────────────
  if (state.layers.driver) {
    state.layers.driver.setLatLng([pos.lat, pos.lng]);
    // Only recreate icon when bearing changes significantly (saves DOM thrash)
    const bearingDelta = Math.abs(state.lastBearing - rawBearing);
    if (bearingDelta > 3) {
      state.layers.driver.setIcon(createDriverMarker(state.lastBearing));
    }
  }

  // ── Grow the progress trail ───────────────────────────────────
  if (state.simulationFrac - SIM.lastTrailFrac >= SIM.TRAIL_SAMPLE_EVERY) {
    SIM.trailLatLngs.push([pos.lat, pos.lng]);
    SIM.lastTrailFrac = state.simulationFrac;
    if (state.layers.trailLine) {
      state.layers.trailLine.setLatLngs(SIM.trailLatLngs);
    }
  }

  // ── Camera: pan to keep driver in view ───────────────────────
  if (state.followDriver) {
    const mapBounds = state.map.getBounds();
    const driverLL  = L.latLng(pos.lat, pos.lng);
    // Pan only if driver is near the edge (20% margin)
    const pad = 0.20;
    const latRange = mapBounds.getNorth() - mapBounds.getSouth();
    const lngRange = mapBounds.getEast() - mapBounds.getWest();
    const tooCloseN = pos.lat > mapBounds.getNorth() - latRange * pad;
    const tooCloseS = pos.lat < mapBounds.getSouth() + latRange * pad;
    const tooCloseE = pos.lng > mapBounds.getEast() - lngRange * pad;
    const tooCloseW = pos.lng < mapBounds.getWest() + lngRange * pad;

    if (tooCloseN || tooCloseS || tooCloseE || tooCloseW) {
      state.map.panTo(driverLL, { animate: true, duration: 0.4, easeLinearity: 0.8 });
    }
  }

  // ── Update progress bar & toast ───────────────────────────────
  const pct = Math.round(state.simulationFrac * 100);
  updateProgressBar(pct);

  const toastSubEl = document.getElementById('toast-subtitle');
  if (toastSubEl) {
    toastSubEl.textContent = `${route.name} · ${pct}%`;
  }

  // ── End of route ──────────────────────────────────────────────
  if (state.simulationFrac >= 1) {
    // Add exact final point to trail
    const endLL = state.routeCoords[state.routeCoords.length - 1];
    SIM.trailLatLngs.push(endLL);
    if (state.layers.trailLine) state.layers.trailLine.setLatLngs(SIM.trailLatLngs);

    finishSimulation();
    return;
  }

  state.simulationFrame = requestAnimationFrame(tick);
}

function stopSimulation() {
  state.isSimulating = false;
  if (state.simulationFrame) {
    cancelAnimationFrame(state.simulationFrame);
    state.simulationFrame = null;
  }
  SIM.lastTimestamp = null;
}

function finishSimulation() {
  state.isSimulating = false;
  state.simulationFrame = null;
  SIM.lastTimestamp = null;

  setStatus('idle', 'Destination reached ✓');
  setDriverToast(true, 'Driver EN-042', 'Destination reached ✓');
  updateProgressBar(100);

  const btn = document.getElementById('btn-start');
  if (btn) {
    btn.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><polygon points="5,3 17,10 5,17" fill="currentColor"/></svg>
      Restart
    `;
    btn.classList.add('btn-restart');
  }
}

// Rebuild trail latLngs for already-traveled segment (used on Resume)
function rebuildTrail() {
  const route = ROUTES[state.currentRouteId];
  const samples = Math.ceil(state.simulationFrac / SIM.TRAIL_SAMPLE_EVERY);
  SIM.trailLatLngs = [];
  for (let i = 0; i <= samples; i++) {
    const f = (i / samples) * state.simulationFrac;
    const p = interpolateAlongRoute(route.coords, f);
    SIM.trailLatLngs.push([p.lat, p.lng]);
  }
  if (state.layers.trailLine) state.layers.trailLine.setLatLngs(SIM.trailLatLngs);
}

// ── Pickup Eligibility ────────────────────────────────────────
function updatePickupEligibility() {
  let eligibleCount = 0;
  state.pickupMarkers.forEach(pm => {
    const eligible = isPointInCorridor(pm.data.lat, pm.data.lng, state.corridorPolygon);
    if (eligible !== pm.eligible) {
      pm.eligible = eligible;
      pm.marker.setIcon(createPickupMarker(eligible));
    }
    if (eligible) eligibleCount++;
  });
  updatePickupStats(eligibleCount, state.pickupMarkers.length);
}

// ── Math helpers ──────────────────────────────────────────────
function computeBearing(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const toDeg = r => (r * 180) / Math.PI;
  const dLng  = toRad(lng2 - lng1);
  const φ1    = toRad(lat1);
  const φ2    = toRad(lat2);
  const y     = Math.sin(dLng) * Math.cos(φ2);
  const x     = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Shortest-path angle interpolation (handles 359°→1° wrap-around)
function lerpAngle(from, to, t) {
  let diff = to - from;
  if (diff > 180)  diff -= 360;
  if (diff < -180) diff += 360;
  return (from + diff * t + 360) % 360;
}

// ── Progress Bar ──────────────────────────────────────────────
function resetProgressBar() {
  const bar = document.getElementById('progress-fill');
  const pctEl = document.getElementById('progress-pct');
  if (bar)   bar.style.width = '0%';
  if (pctEl) pctEl.textContent = '0%';
}

function updateProgressBar(pct) {
  const bar   = document.getElementById('progress-fill');
  const pctEl = document.getElementById('progress-pct');
  if (bar)   bar.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

// ── Layer Visibility ──────────────────────────────────────────
function applyLayerVisibility(states) {
  const { map, layers } = state;

  const toggleLayer = (layer, visible) => {
    if (!layer) return;
    if (visible  && !map.hasLayer(layer)) map.addLayer(layer);
    if (!visible &&  map.hasLayer(layer)) map.removeLayer(layer);
  };

  toggleLayer(layers.zone,      states.zone);
  toggleLayer(layers.corridor,  states.corridor);

  state.pickupMarkers.forEach(pm => {
    if  (states.pickups && !map.hasLayer(pm.marker)) map.addLayer(pm.marker);
    if (!states.pickups &&  map.hasLayer(pm.marker)) map.removeLayer(pm.marker);
  });

  if (states.h3 && state.h3CellLayers.length === 0) {
    renderH3Cells();
  } else if (!states.h3) {
    state.h3CellLayers.forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
    state.h3CellLayers = [];
  }
}

// ── Popup Styling ─────────────────────────────────────────────
function injectPopupStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-popup-content-wrapper {
      background: rgba(10,13,20,0.96) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
      border-radius: 10px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
      color: #F0F4FF !important;
      backdrop-filter: blur(12px) !important;
    }
    .leaflet-popup-tip-container .leaflet-popup-tip {
      background: rgba(10,13,20,0.96) !important;
    }
    .leaflet-popup-close-button { color: #6B7280 !important; }
    .leaflet-popup-close-button:hover { color: #F0F4FF !important; }
    .btn-restart { background: #00E5A0 !important; color: #0A0D14 !important; }
  `;
  document.head.appendChild(style);
}

// ── UI Event Bindings ─────────────────────────────────────────
function bindUI() {
  const btnStart = document.getElementById('btn-start');

  const setBtnPause = () => {
    if (!btnStart) return;
    btnStart.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="5" y="3" width="4" height="14" rx="1" fill="currentColor"/>
        <rect x="11" y="3" width="4" height="14" rx="1" fill="currentColor"/>
      </svg>
      Pause
    `;
    btnStart.classList.remove('btn-restart');
  };

  const setBtnStart = (label = 'Start Simulation') => {
    if (!btnStart) return;
    btnStart.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><polygon points="5,3 17,10 5,17" fill="currentColor"/></svg>
      ${label}
    `;
    btnStart.classList.remove('btn-restart');
  };

  // ── Start / Pause / Resume / Restart ─────────────────────────
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (state.isSimulating) {
        // → Pause
        stopSimulation();
        setStatus('idle', 'Paused');
        setDriverToast(false);
        setBtnStart('Resume');
      } else if (state.simulationFrac >= 1) {
        // → Restart from beginning
        state.simulationFrac = 0;
        SIM.trailLatLngs = [];
        loadRoute(state.currentRouteId);
        setTimeout(() => {
          startSimulation();
          setBtnPause();
        }, 900);
      } else {
        // → Start or Resume
        startSimulation();
        setBtnPause();
        setDriverToast(true, 'Driver EN-042',
          `${ROUTES[state.currentRouteId].name} · Live`);
      }
    });
  }

  // ── Reset ─────────────────────────────────────────────────────
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      stopSimulation();
      state.simulationFrac = 0;
      SIM.trailLatLngs = [];
      loadRoute(state.currentRouteId);
      setDriverToast(false);
      setBtnStart('Start Simulation');
    });
  }

  // ── Route Presets ─────────────────────────────────────────────
  ['btn-route-1', 'btn-route-2', 'btn-route-3'].forEach((id, i) => {
    const btn     = document.getElementById(id);
    const routeId = `route${i + 1}`;
    if (btn) {
      btn.addEventListener('click', () => {
        stopSimulation();
        state.simulationFrac = 0;
        SIM.trailLatLngs = [];
        loadRoute(routeId);
        setDriverToast(false);
        setBtnStart('Start Simulation');
      });
    }
  });

  // ── Camera Follow toggle ──────────────────────────────────────
  const btnFollow = document.getElementById('btn-follow');
  if (btnFollow) {
    btnFollow.addEventListener('click', () => {
      state.followDriver = !state.followDriver;
      btnFollow.classList.toggle('active', state.followDriver);
      btnFollow.title = state.followDriver ? 'Camera: Following driver' : 'Camera: Free';
    });
  }

  // ── Layer Toggles ─────────────────────────────────────────────
  bindLayerToggles(states => applyLayerVisibility(states));

  // ── Speed Slider ──────────────────────────────────────────────
  bindSpeedSlider(speed => { state.speedMultiplier = speed; });
}

// ── Bootstrap ─────────────────────────────────────────────────
// ES module scripts are deferred — DOM is ready when this runs.
function init() {
  injectPopupStyles();
  initMap();
  bindUI();

  setTimeout(() => {
    loadRoute(DEFAULT_ROUTE);
    setStatus('idle', 'Ready – press Start');
  }, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
