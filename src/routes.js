/**
 * routes.js – Macro Rides Route Presets
 * ─────────────────────────────────────────────────────────────
 * Three simulated EV routes around Bengaluru (Bangalore), India.
 * Coordinates are [lng, lat] (GeoJSON convention) for Turf.js,
 * and will be swapped to [lat, lng] where Leaflet requires it.
 *
 * Each route includes pickup points scattered around the route
 * with some inside and some outside the 350m corridor.
 */

export const ROUTES = {
  route1: {
    id: 'route1',
    name: 'Route A – Downtown',
    color: '#4A8FFF',
    // MG Road → Brigade Road → Residency Road → Richmond Circle
    coords: [
      [77.6033, 12.9731], // MG Road start
      [77.6070, 12.9720],
      [77.6100, 12.9700],
      [77.6125, 12.9682],
      [77.6140, 12.9660],
      [77.6155, 12.9640],
      [77.6170, 12.9618],
      [77.6185, 12.9595],
      [77.6200, 12.9572],
      [77.6215, 12.9550],
      [77.6230, 12.9528],
      [77.6240, 12.9505], // Richmond Circle end
    ],
    center: [12.9620, 77.6140],
    zoom: 14,
    pickupPoints: [
      { id: 'p1a', lat: 12.9738, lng: 77.6040, name: 'MG Road Metro' },
      { id: 'p1b', lat: 12.9715, lng: 77.6080, name: 'Brigade Road Hub' },
      { id: 'p1c', lat: 12.9700, lng: 77.6110, name: 'Commercial St.' },
      { id: 'p1d', lat: 12.9670, lng: 77.6150, name: 'Residency Corner' },
      { id: 'p1e', lat: 12.9645, lng: 77.6170, name: 'Park View Stop' },
      { id: 'p1f', lat: 12.9610, lng: 77.6200, name: 'Church St. Node' },
      { id: 'p1g', lat: 12.9580, lng: 77.6220, name: 'Richmond Circle' },
      { id: 'p1h', lat: 12.9750, lng: 77.6200, name: 'Cunningham Rd' }, // far
      { id: 'p1i', lat: 12.9780, lng: 77.6000, name: 'Queens Rd.' },    // far
      { id: 'p1j', lat: 12.9500, lng: 77.6280, name: 'Langford Town' }, // far
      { id: 'p1k', lat: 12.9660, lng: 77.6130, name: 'Infantry Rd.' },
      { id: 'p1l', lat: 12.9635, lng: 77.6160, name: 'St. Marks Rd.' },
    ],
  },

  route2: {
    id: 'route2',
    name: 'Route B – Airport Corridor',
    color: '#4A8FFF',
    // Hebbal → Bellary Road → Devanahalli (simplified)
    coords: [
      [77.5946, 13.0358], // Hebbal flyover
      [77.5958, 13.0410],
      [77.5965, 13.0465],
      [77.5972, 13.0520],
      [77.5980, 13.0580],
      [77.5988, 13.0640],
      [77.5995, 13.0700],
      [77.6002, 13.0760],
      [77.6010, 13.0820],
      [77.6018, 13.0880],
      [77.6025, 13.0940],
      [77.6032, 13.1000], // Yelahanka
    ],
    center: [13.0680, 77.5990],
    zoom: 13,
    pickupPoints: [
      { id: 'p2a', lat: 13.0365, lng: 77.5940, name: 'Hebbal Lake Stop' },
      { id: 'p2b', lat: 13.0415, lng: 77.5952, name: 'Nagawara Hub' },
      { id: 'p2c', lat: 13.0470, lng: 77.5960, name: 'RT Nagar Node' },
      { id: 'p2d', lat: 13.0530, lng: 77.5968, name: 'Kogilu Cross' },
      { id: 'p2e', lat: 13.0590, lng: 77.5975, name: 'Jakkur Junction' },
      { id: 'p2f', lat: 13.0650, lng: 77.5983, name: 'Thanisandra Stop' },
      { id: 'p2g', lat: 13.0710, lng: 77.5990, name: 'Bellary Rd Hub' },
      { id: 'p2h', lat: 13.0770, lng: 77.5997, name: 'Yelahanka Old Town' },
      { id: 'p2i', lat: 13.0450, lng: 77.5800, name: 'Jalahalli Village' }, // far
      { id: 'p2j', lat: 13.0600, lng: 77.6150, name: 'Hennur Rd.' },        // far
      { id: 'p2k', lat: 13.0820, lng: 77.5850, name: 'BEL Layout' },        // far
      { id: 'p2l', lat: 13.0350, lng: 77.6100, name: 'Kammanahalli' },      // far
    ],
  },

  route3: {
    id: 'route3',
    name: 'Route C – Suburban',
    color: '#4A8FFF',
    // Electronic City → Bommanahalli → Koramangala
    coords: [
      [77.6705, 12.8399], // Electronic City Phase 1
      [77.6680, 12.8480],
      [77.6650, 12.8560],
      [77.6620, 12.8640],
      [77.6590, 12.8720],
      [77.6560, 12.8800],
      [77.6530, 12.8880],
      [77.6500, 12.8960],
      [77.6470, 12.9040],
      [77.6440, 12.9120],
      [77.6410, 12.9200],
      [77.6380, 12.9280], // Koramangala
    ],
    center: [12.8840, 77.6545],
    zoom: 13,
    pickupPoints: [
      { id: 'p3a', lat: 12.8405, lng: 77.6700, name: 'E-City Phase 1' },
      { id: 'p3b', lat: 12.8490, lng: 77.6672, name: 'Neeladri Rd.' },
      { id: 'p3c', lat: 12.8575, lng: 77.6644, name: 'Singasandra Jn.' },
      { id: 'p3d', lat: 12.8655, lng: 77.6615, name: 'Hosa Road Stop' },
      { id: 'p3e', lat: 12.8735, lng: 77.6585, name: 'Bommanahalli Hub' },
      { id: 'p3f', lat: 12.8815, lng: 77.6555, name: 'BTM Layout Node' },
      { id: 'p3g', lat: 12.8895, lng: 77.6525, name: 'JP Nagar 7th' },
      { id: 'p3h', lat: 12.8975, lng: 77.6495, name: 'Koramangala 4B' },
      { id: 'p3i', lat: 12.9055, lng: 77.6465, name: 'Forum Mall Stop' },
      { id: 'p3j', lat: 12.8600, lng: 77.6800, name: 'Chandapura' },    // far
      { id: 'p3k', lat: 12.8750, lng: 77.6750, name: 'Begur Junction' }, // far
      { id: 'p3l', lat: 12.9100, lng: 77.6300, name: 'Agara Lake' },     // far
    ],
  },
};

export const DEFAULT_ROUTE = 'route1';
