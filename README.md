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
- Select a block and switch between ground and 1st–4th floors. Real plan scans are available as map bases with a separate simplified SVG overview. Floor 0 scans show the campus plan and the Block B/E ground-floor drawing; floors 1–4 have approximate layouts.
- Routes use Dijkstra's algorithm and include graph-derived walking and stairs instructions. The Fastest and Accessible (no stairs) choices are explicit. Since the supplied scans do not verify lifts or ramps, no step-free route to an upper floor is claimed; the UI reports when one cannot be verified.
- Simulated route progress, landmark starting points, QR print sheets, speech synthesis, optional browser speech recognition, camera-overlay AR guidance with a photo fallback, emergency exit routing, and sample event links.
- The admin page uses demo PIN **1234**. Corridor-condition switches, announcements, and search/route counters are saved locally and broadcast to other tabs on the same origin. This is a demo convenience, not production authentication or a cross-device service.
- The digital twin is a lazy-loaded interactive Three.js view. Its geometry is illustrative demo data, not a surveyed building model.
- The progressive web app caches the application shell for offline reopening. Search/routing data ships in the static build.
- Lenis provides smooth scrolling and defers to the operating system's reduced-motion preference.
- AR opens an optional camera overlay with compass arrows and a destination-photo fallback. It is not world-anchored and does not claim to implement WebXR.

## Editing campus data

`src/data/campus.json` is the source of truth for buildings, rooms, graph nodes, and edges.

### Add a room

1. Add a room to `rooms`. Use an ID shaped like `BLOCK-FLOOR-NUMBER`; ground-floor rooms use a `0` floor segment.
2. Set `block`, numeric `floor` (0–4), `type`, `dept`, useful search `aliases`, and a simple `polygon`.
3. Add a matching graph `node` with the **same ID**, a floor corridor node, and an accessible `corridor` edge connecting them. Node coordinates are percentages of the illustrated map.
4. Add or adjust routing edges only after confirming the physical connections and accessibility. The current graph has stairs but no verified lift/ramp edges; don't mark a route step-free unless on-site verification supports it. Run `npm test` and `npm run build`.

The supplied source is `inputs/1000315152_merged.pdf` (29 pages in the provided merged file). Every page was rendered for visual inspection. Real plan scans from pages 16–19 are straightened/cropped into WebP files in `public/maps/`; the page 16 campus plan is the photographed overview base, while page 19 shows the Block B/E ground-floor drawing. Room-sign photos from pages 20–29 are cropped into `public/photos/<room-code>.webp` and shown with matching destinations. The official college logo is stored locally in `public/assets/`; no remote image hotlinks are used. Map-to-graph control points in `campus.json` are hand-estimated from the scans, not surveyed calibration. The clean SVG is only an optional alternative map view. Room assignments for the provided codes follow their block/floor code (for example `E-205` is Block E, floor 2); other room positions and graph connections are plausible demo assumptions.

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
- The merged PDF has 29 pages although the request described 14. Plan photos and door signs were visually inspected and cropped from that provided file. The campus graph, route distances, indoor corridor geometry, map transforms, upper-floor rooms, and cross-block connections are not surveyed; image alignment is approximate and no 70 m²/corridor-width calibration was possible from the scan.
- Tests cover Main Gate to E-205, C-004, E-012, B-407, and E-205 to E-111, including stair transitions where floors change. The drawings do not verify any lift or ramp, so Accessible mode returns no route for destinations that require stairs. Real step-free access must be surveyed before it is represented.
- The supplied gate coordinates were written as the placeholder `LAT,LNG`, not actual coordinates. The Street View button therefore uses a clearly editable approximate Abids-area default; it is not a surveyed campus entrance.
- No personal 360° panoramas or Street View share-link file were provided. Until you add them, the UI shows “360° view coming soon” rather than broken imagery.
- Position and route progress are simulated. The camera overlay is visual guidance only; compass readings and optional motion-based step estimates vary by device and are not world-anchored AR. A future real positioning system should use campus-tested Bluetooth beacons or Wi-Fi positioning in an appropriate native app.
- The admin PIN is hard-coded demo access, state and analytics are local to the browser, and BroadcastChannel only synchronizes open tabs on the same origin. This is not a secure multi-user admin system.
- Events are illustrative samples. Confirm event schedules with the college.
- Browser speech recognition availability and installed voices vary by device; speech synthesis is used only when supported, and the language selector offers English, Telugu, and Hindi.
- The PWA caches app assets for offline reopening, but external Street View links need internet access. This prototype does not claim a tested production Lighthouse score or emergency-service suitability.

## Roadmap

1. Survey and institutionally verify all floors, room locations, entrances, vertical circulation, accessible routes, distances, and official gate coordinates; replace illustrative maps with verified accessible floor plans.
2. Add campus-owned pano capture and reviewed hotspot links.
3. Add real positioning using campus-tested Bluetooth beacons or Wi-Fi in a native app; explicitly handle indoor location uncertainty.
4. Add WebXR AR only after map accuracy and positioning pass campus validation.
5. Connect authenticated campus operations data and live IoT building information for a verified digital twin.
