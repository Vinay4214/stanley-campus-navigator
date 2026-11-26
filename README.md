# Stanley Campus Navigator

A mobile-first indoor and outdoor wayfinding demo for Stanley College of Engineering & Technology for Women in Abids, Hyderabad. The app combines fuzzy room search, a multi-floor route graph, illustrated campus and floor maps, accessibility routing, emergency exits, voice controls, printable landmark QR codes, sample events, a local admin dashboard, a 3D campus model, and owner-supplied 360° panoramas/official share links.

> **Demo only:** indoor distances, floor plans, room positions, exits, positioning, event listings, and the 3D model have not been surveyed or verified on site. Do not rely on this prototype for emergency response, accessibility planning, examinations, or other real-world wayfinding. Follow campus signage and staff instructions.

## Run locally

Requires Node.js 20.19+ (or 22.12+) and npm.

```powershell
npm install
npm run dev
```

Open the address printed by Vite. Verify the production build and routing tests with:

```powershell
npm test
npm run build
```

The static production bundle is written to `dist/`. Vercel is configured for SPA rewrites in `vercel.json`. Optional campus coordinates can be supplied as `VITE_CAMPUS_LAT` and `VITE_CAMPUS_LNG` build environment variables. The demo defaults to approximate coordinates for central Abids, Hyderabad; replace them only after the actual campus gate has been verified.

## Features

- Search by room code, room name, department, HoD, lab, library, exam office, canteen, or washroom. Searches use Fuse.js and support simple natural-language prefixes such as “where is” and “take me to.” Recent searches are shown as quick chips.
- Select a block and switch between ground and 1st–4th floors. Upper floors display an explicit approximate-layout notice.
- Routes use Dijkstra's algorithm. Accessibility mode excludes stairs and uses edges marked accessible; the high-contrast palette and large-text control are available in the header.
- Simulated route progress, landmark starting points, QR print sheets, speech synthesis, optional browser speech recognition, emergency exit routing, and sample event links.
- The admin page uses demo PIN **1234**. Corridor-condition switches, announcements, and search/route counters are saved locally and broadcast to other tabs on the same origin. This is a demo convenience, not production authentication or a cross-device service.
- The digital twin is a lazy-loaded interactive Three.js view. Its geometry is illustrative demo data, not a surveyed building model.
- The progressive web app caches the application shell for offline reopening. Search/routing data ships in the static build.
- Lenis provides smooth scrolling and defers to the operating system's reduced-motion preference.
- AR is intentionally presented only as a roadmap item. The app does not claim to implement WebXR.

## Editing campus data

`src/data/campus.json` is the source of truth for buildings, rooms, graph nodes, and edges.

### Add a room

1. Add a room to `rooms`. Use an ID shaped like `BLOCK-FLOOR-NUMBER`; ground-floor rooms use a `0` floor segment.
2. Set `block`, numeric `floor` (0–4), `type`, `dept`, useful search `aliases`, and a simple `polygon`.
3. Add a matching graph `node` with the **same ID**, a floor corridor node, and an accessible `corridor` edge connecting them. Node coordinates are percentages of the illustrated map.
4. Add or adjust routing edges only after confirming the physical connections and accessibility. Run `npm test` and `npm run build`.

The supplied scanned plan was reviewed visually, not treated as surveyed CAD. The first release uses a clean, simplified SVG overview rather than rehosting plan photographs as interactive maps. Room assignments for the provided codes follow their block/floor code (for example `E-205` is Block E, floor 2). Other room positions and graph connections are plausible demo assumptions, not verified locations.

### Add a route edge

Add a record to `edges` with `from`, `to`, `weight` (an estimated distance in metres), `type` (`corridor`, `stairs`, `lift`, `ramp`, or `outdoor`), and `accessible`. Administrators can block an edge temporarily in the browser; base campus data remains unchanged. Add stairs and lift connections as separate edges.

### Add a personal panorama

Place your own equirectangular panorama in `public/360/`, then add a record to `src/data/panoramas.json`:

```json
[
  {
    "file": "library-E205-floor2.jpg",
    "room": "E-205",
    "name": "Library · second floor",
    "hotspots": ["E-204"]
  }
]
```

Use descriptive filenames such as `library-E205-floor2.jpg`; `file` is the filename within `public/360/`, `room` is the related room code, and `name` is its visible label. `hotspots` lists the room IDs of connected panoramas; the **360° views** page shows clickable arrow chips for available linked panoramas, and matching route steps offer a **Preview this turn** link. Keep source images optimized and obtain appropriate permission before publishing photos.

### Add an official Google Maps share link

Create `inputs/streetview-links.txt`, with one line per **owner-provided** official Maps share URL:

```text
Library E-205 | https://maps.app.goo.gl/your-official-share-link
```

Run `npm run streetview:build`. The script matches place text or room codes against the campus room catalog, writes matched HTTPS Google Maps URLs (`google.com` or `maps.app.goo.gl`) to `src/data/streetview.json`, and reports unmatched/invalid lines. Never paste scraped imagery or synthesized links into this file. Google Maps/Street View imagery is never scraped, captured, downloaded, cached, or re-hosted by this project. External links open in a new tab with `rel="noopener noreferrer"`.

## Assumptions and limitations

- Block labels A–E and the named campus features are shown per the supplied plan and brief. Where the photographed plan is hard to read, the simplified overview uses the supplied plan's five-block labels, not inferred photo labels.
- Room-code floor values are interpreted as requested: the middle code number is the floor (`0` through `4`). Supplied room names, departments, and HoD names are reproduced from the project brief and need campus verification.
- The original PDF is a scanned drawing rather than extractable plan text; no scale or navigable room geometry was established from it. The campus overview, route distances, upper-floor rooms, vertical circulation, cross-block connections, and accessible edges are simplified demo approximations.
- The supplied gate coordinates were written as the placeholder `LAT,LNG`, not actual coordinates. The Street View button therefore uses a clearly editable approximate Abids-area default; it is not a surveyed campus entrance.
- No personal 360° panoramas or Street View share-link file were provided. Until you add them, the UI shows “360° view coming soon” rather than broken imagery.
- Position is simulated. A future real positioning system should use campus-tested Bluetooth beacons or Wi-Fi positioning in an appropriate native app.
- The admin PIN is hard-coded demo access, state and analytics are local to the browser, and BroadcastChannel only synchronizes open tabs on the same origin. This is not a secure multi-user admin system.
- Events are illustrative samples. Confirm event schedules with the college.
- Browser speech recognition availability and installed voices vary by device; speech synthesis is used only when supported, and the language selector offers English, Telugu, and Hindi.
- The PWA caches app assets for offline reopening, but external Street View links need internet access. This prototype does not claim a tested production Lighthouse score or emergency-service suitability.

## Roadmap

1. Survey and institutionally verify all floors, room locations, entrances, vertical circulation, accessible routes, distances, and official gate coordinates; replace illustrative maps with verified accessible floor plans.
2. Add campus-owned pano capture and reviewed hotspot links.
3. Add real positioning using campus-tested Bluetooth beacons or Wi-Fi in a native app; explicitly handle indoor location uncertainty.
4. Explore WebXR AR only after map accuracy and positioning pass campus validation.
5. Connect authenticated campus operations data and live IoT building information for a verified digital twin.
