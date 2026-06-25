# Macro Rides – Hyperlocal EV Mobility Demo

## Architecture & Approach

### Overview
Macro Rides is a web-based EV mobility visualization demo that shows real-time route corridors, H3 geospatial indexing, and dynamic pickup point eligibility on a full-screen dark-mode map.

---

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Map Rendering** | Leaflet.js 1.9.4 | Tile-based map, markers, polylines, polygons |
| **Dark Map Tiles** | CARTO Dark Matter (CDN) | No API key required |
| **Geospatial Buffer** | Turf.js 6 | 350m buffer polygon around route |
| **Spatial Indexing** | H3-js 4.1.0 | Hexagonal cell indexing at resolution 9 |
| **Fonts** | Google Fonts (Inter + Space Grotesk) | Modern mobility aesthetic |
| **Styling** | Vanilla CSS (CSS variables, 8px grid) | Theme-ready design system |

---

### Spatial Pipeline

```
Route Coords (lng,lat)
        │
        ▼
  Turf.js lineString
        │
        ▼
  turf.buffer(350m)         ← 350m corridor GeoJSON polygon
        │
        ├──► Leaflet corridor layer (translucent blue polygon)
        │
        ├──► h3.polygonToCells(res=9)  ← H3 spatial index
        │         │
        │         └──► Set<h3Index>    ← O(1) eligibility lookups
        │
        └──► For each pickup point:
                  turf.booleanPointInPolygon()
                  ▶ eligible (green) / ineligible (grey)
```

**H3 Resolution 9** was chosen because its average hexagon edge length (~174m) provides good coverage of the 350m buffer while maintaining a manageable cell count per route segment.

---

### File Structure

```
Week1/
├── index.html              # Entry point – semantic HTML5, aria roles
├── styles/
│   └── main.css            # Design system: CSS variables, 8px grid, dark theme
├── src/
│   ├── main.js             # App orchestrator – map init, simulation loop
│   ├── spatial.js          # H3 + Turf spatial utilities
│   ├── routes.js           # Route presets (Bengaluru coords + pickup points)
│   ├── markers.js          # SVG DivIcon factory (driver, pickups, pins)
│   └── ui.js               # UI controller (stats, toggles, toasts, counters)
└── README.md               # This file
```

---

### Key Features

#### 1. 350m Route Corridor Buffer
- Generated using `turf.buffer()` with `steps: 32` for smooth polygon edges
- Rendered as a translucent blue polygon overlay on the map
- Toggleable via the Layers panel

#### 2. H3 Geospatial Indexing
- The corridor polygon is indexed into H3 cells at resolution 9
- The H3 cell set is precomputed once per route load for O(1) eligibility
- Visualized as yellow hexagonal grid (toggle in Layers panel)

#### 3. Pickup Point Eligibility
- Each pickup point is evaluated with `turf.booleanPointInPolygon()`
- **Eligible stops** (within 350m corridor): glowing green bus-stop icon, larger size
- **Ineligible stops** (outside corridor): muted grey icon
- Stat card shows live eligible / total counts with animated counter

#### 4. Driver Simulation
- Driver moves along the route using `turf.along()` for accurate interpolation
- Speed is configurable (1× to 10×) via the slider
- Bearing is computed for marker rotation to match movement direction
- Animated pulse ring surrounds the driver marker

#### 5. Layers
| Layer | Default | Description |
|---|---|---|
| Zone Boundary | ON | Operating area (convex hull + 600m buffer) |
| 350m Corridor | ON | Buffer around driver's route |
| H3 Cells | OFF | Hexagonal spatial index cells |
| Pickup Points | ON | All pickup stops with eligibility color |

#### 6. Accessibility
- `prefers-reduced-motion` respected: animations disabled system-wide
- ARIA roles and `aria-label` on all interactive elements
- `aria-live` on status label and driver toast for screen readers

---

### Design System

All colors are defined as **CSS variables** in `styles/main.css`:

```css
/* Spatial layer colors – easily themeable */
--color-route:           #4A8FFF;
--color-corridor:        rgba(74, 143, 255, 0.12);
--color-zone-border:     rgba(0, 229, 160, 0.35);
--color-h3-border:       rgba(255, 181, 71, 0.45);
--color-eligible:        #00E5A0;
--color-ineligible:      #6B7280;
```

All spacing follows an **8px grid** (`--sp-1` = 4px, `--sp-2` = 8px, etc.).

---

### Running Locally

Open `index.html` directly in a modern browser (Chrome/Edge/Firefox).  
All dependencies are loaded via CDN – no build step required.

> **Note**: Some browsers may block ES module imports from `file://` URLs.  
> Use a local dev server for best results:
> ```bash
> npx -y serve .
> # or
> python -m http.server 8080
> ```

---

### Route Data

Three simulated routes around **Bengaluru (Bangalore), India**:

| Route | Path | Pickup Points |
|---|---|---|
| A – Downtown | MG Road → Richmond Circle | 12 stops |
| B – Airport Corridor | Hebbal → Yelahanka | 12 stops |
| C – Suburban | Electronic City → Koramangala | 12 stops |

Each route has ~8 stops within the 350m corridor and ~4 outside it, demonstrating the eligibility filtering clearly.
