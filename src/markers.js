/**
 * markers.js – Macro Rides SVG Marker Factory
 * ─────────────────────────────────────────────────────────────
 * Generates clean SVG-based Leaflet DivIcons for:
 *  • Driver vehicle marker (animated pulse)
 *  • Eligible pickup point (glowing green pin)
 *  • Ineligible pickup point (muted grey pin)
 *  • Zone origin / destination pins
 */

/**
 * Creates the animated driver marker DivIcon.
 * The EV icon is a clean SVG vehicle silhouette.
 *
 * @param {number} bearing – degrees 0-360 for rotation (optional)
 * @returns {L.DivIcon}
 */
export function createDriverMarker(bearing = 0) {
  const html = `
    <div class="marker-driver-wrap" style="width:44px;height:44px;position:relative;">
      <div class="marker-driver-pulse"></div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 44 44"
        width="44" height="44"
        style="position:relative;z-index:2;transform:rotate(${bearing}deg);filter:drop-shadow(0 0 8px rgba(0,229,160,0.6));"
        aria-hidden="true"
      >
        <!-- Outer glow circle -->
        <circle cx="22" cy="22" r="20" fill="rgba(0,229,160,0.15)" stroke="rgba(0,229,160,0.5)" stroke-width="1.5"/>
        <!-- EV car body -->
        <rect x="10" y="18" width="24" height="10" rx="3" fill="#00E5A0"/>
        <!-- Windshield -->
        <path d="M14 18 L16 13 L28 13 L30 18 Z" fill="#0a2e22"/>
        <!-- Wheels -->
        <circle cx="15" cy="28" r="3" fill="#0A0D14" stroke="#00E5A0" stroke-width="1.5"/>
        <circle cx="29" cy="28" r="3" fill="#0A0D14" stroke="#00E5A0" stroke-width="1.5"/>
        <!-- Headlights -->
        <circle cx="33" cy="21" r="1.5" fill="#fff" opacity="0.9"/>
        <circle cx="33" cy="25" r="1.5" fill="#fff" opacity="0.9"/>
        <!-- Tail lights -->
        <circle cx="11" cy="21" r="1.5" fill="#FF5252" opacity="0.9"/>
        <circle cx="11" cy="25" r="1.5" fill="#FF5252" opacity="0.9"/>
        <!-- EV bolt -->
        <path d="M21 16 L19 21 L22 21 L20 26 L25 19 L22 19 Z" fill="#fff" opacity="0.95"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -28],
  });
}

/**
 * Creates a pickup point marker SVG DivIcon.
 *
 * @param {boolean} eligible – whether the stop is within the corridor
 * @param {string} label     – short label (1-2 chars)
 * @returns {L.DivIcon}
 */
export function createPickupMarker(eligible, label = '') {
  const color = eligible ? '#00E5A0' : '#6B7280';
  const glowColor = eligible ? 'rgba(0,229,160,0.45)' : 'rgba(107,114,128,0.2)';
  const bgColor = eligible ? 'rgba(0,229,160,0.12)' : 'rgba(107,114,128,0.08)';
  const strokeOpacity = eligible ? '1' : '0.6';
  const glow = eligible ? `filter:drop-shadow(0 0 6px ${glowColor})` : '';
  const size = eligible ? 32 : 26;
  const anchor = Math.round(size / 2);

  const html = `
    <div class="pickup-marker" style="width:${size}px;height:${size}px;">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="${size}" height="${size}"
        style="${glow}"
        aria-hidden="true"
      >
        <!-- Background circle -->
        <circle cx="16" cy="16" r="14" fill="${bgColor}" stroke="${color}" stroke-width="${eligible ? 1.8 : 1.2}" opacity="${strokeOpacity}"/>
        <!-- Bus stop icon -->
        <rect x="9" y="8" width="14" height="10" rx="2" fill="${color}" opacity="${eligible ? '0.9' : '0.5'}"/>
        <rect x="11" y="18" width="2" height="4" rx="1" fill="${color}" opacity="${eligible ? '0.7' : '0.4'}"/>
        <rect x="19" y="18" width="2" height="4" rx="1" fill="${color}" opacity="${eligible ? '0.7' : '0.4'}"/>
        <!-- Window -->
        <rect x="11" y="10" width="4" height="4" rx="1" fill="${eligible ? '#0A2E22' : '#1a1a2e'}" opacity="0.8"/>
        <rect x="17" y="10" width="4" height="4" rx="1" fill="${eligible ? '#0A2E22' : '#1a1a2e'}" opacity="0.8"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor - 4],
  });
}

/**
 * Creates origin / destination pin markers.
 *
 * @param {'origin'|'destination'} type
 * @returns {L.DivIcon}
 */
export function createRouteEndpointMarker(type) {
  const color = type === 'origin' ? '#00E5A0' : '#FF5252';
  const label = type === 'origin' ? 'A' : 'B';

  const html = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"
         style="filter:drop-shadow(0 2px 8px rgba(0,0,0,0.6));">
      <!-- Pin body -->
      <path d="M16 2 C9.4 2 4 7.4 4 14 C4 22.5 16 38 16 38 C16 38 28 22.5 28 14 C28 7.4 22.6 2 16 2 Z"
            fill="${color}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
      <!-- Letter -->
      <text x="16" y="18" text-anchor="middle" dominant-baseline="middle"
            font-family="Space Grotesk, sans-serif" font-size="11" font-weight="700"
            fill="${type === 'origin' ? '#0A2E22' : '#fff'}">${label}</text>
    </svg>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -44],
  });
}
