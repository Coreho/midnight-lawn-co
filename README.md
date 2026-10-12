# Midnight Lawn Co. website mockup

_Last updated: 2026-10-12_

A clickable website mockup for **Midnight Lawn Co.**, the overnight surprise yard-greeting business planned in *Surprise Lawn Decorating Business, Wayne County Startup Guide* (Oct 9, 2026). Every price, rule and policy on the site comes from that guide.

The look is **objects on a lawn**. The whole page is one grassy field, and everything else stands on it:
- a white capsule nav;
- pill buttons;
- cream slabs that rise over each other;
- chunky tomato, cobalt and yellow yard letters staked into the grass.

The yard letters are set in Chango and painted for Halloween (pumpkin, witch purple, ink and bone); the hero and the builder's example open on a random Halloween saying. Type a name in the hero and the letters plant themselves while the form checks that we have enough of each letter that night. The **Lawn Builder** lets people lay out a display square by square, then see it in 3D by morning light and at 2 AM.

> This is a design mockup. Nothing is sent anywhere: no bookings, payments, texts or emails. The phone number, email and illustrations are placeholders.

## What's in it

| View | Link | What it does |
|---|---|---|
| Home | `#home` | **Hero:** yard letters with a working booking start (name, occasion, night, live price and letter check).<br>**Then:** the night timeline, prices, the inside-accomplice promise, example lawns, a link into the Lawn Builder, winter methods, service rings, the removal promise, the launch giveaway. |
| Lawn Builder | `#builder` | **Stage 1, their real yard:** type a Wayne County address and the builder models that front yard in 3D from public survey data (see below), then asks "This house?" with next-door buttons or tap-to-pick.<br>**Stage 1, a typical lawn:** pick the lawn's shape (standard, wide, corner, narrow) and size.<br>**Stage 2 on a real yard:** decorate the 3D model directly: a grid of 2.5-ft squares draped over the real lawn, tap to place, drag to move, drag to turn, pinch or scroll to zoom. The square buttons stay in the page for keyboards and screen readers.<br>**Stage 2:** decorate a street view from above, on a grid of 2.5-ft squares. The catalog covers Seasonal, Letters, Emojis, Icons, Messages and Clip-art, and you can type your own word. Place pieces by tapping, dragging or using the keyboard; there's an eraser, undo and clear. A live package, price and letter-stock check runs as you go.<br>**Stage 3:** a 3D scene by morning and at 2 AM, from five angles (street, up close, left, right, above), with a photo strip. **Book this lawn** carries the message, night and package into booking. |
| Book a surprise | `#book` | **Step 1, message:** package, theme, spelling hints, letter check.<br>**Step 2, night and place:** zones, rush fee, landlord okay, buried lines.<br>**Step 3, accomplice and checkout:** consent, house rules.<br>**Then:** a confirmation timeline. |
| Fundraisers and partners | `#groups` | Flocking fundraiser calculator, graduation season, partner list, interest form. |
| FAQ | `#faq` | House rules: consent, content rules, placement, removal, refunds, winter, payment. |
| Crew dashboard | `#crew` | The owner's nightly view with sample data: route with ETAs, pick lists, accomplice status, letter stock after tonight, takedowns, safety checks. |

There is one daytime look (no dark mode). The site respects reduced-motion settings.

### Lawn Builder rules (from the guide)

- **Setback:** the two rows of squares nearest the sidewalk are hatched and can't take stakes, because displays sit 5 ft back. The city strip by the curb is never used. The gas meter square is blocked.
- **Package:** chosen automatically from what's on the lawn.
  - Classic: up to 22 letters and 2 graphics, $95.
  - Deluxe: up to 32 letters and more graphics, $145.
  - Flocking: flamingos only, $75.
  - The builder warns past 32 letters, about 25 theme pieces or 24 flamingos.
- **Letter stock:** checked against the chosen setup night, using the same calendar as booking.
- **3D view:** labelled as an illustration of 18-inch coroplast pieces. Pieces are die-cut cards on wire stakes, built from the same SVG art as the catalog.

## Their real yard (address mode)

`js/yard-survey.js` turns an address into a model, in the browser, from free public data only:

| Step | Source | What it gives |
|---|---|---|
| Address | US Census geocoder (JSONP) | Location, county (only Wayne County is accepted), side of the street; a second lookup of a nearby number tells which way numbers run |
| Streets | OpenFreeMap vector tiles (OpenStreetMap) | Street centrelines and names; decoded by a small built-in tile reader |
| Laser survey | USGS 3DEP lidar, Wayne County 2017 (Entwine tiles on AWS), decoded with laz-perf (WASM) | Ground shape, house footprints and roof heights and shapes, trees (position, height, crown) and shrubs. About 1.3-2 MB per address |
| Aerial photo | USGS NAIP image service | Lawn versus paving, with lidar intensity; 30 s timeout, the model still builds without it |

Then it fits houses as rectangles with gable or hip roofs, snaps driveways, walks and sidewalks to rectangles square to the street, measures the road edge and sidewalk, finds the lot width from the neighbours, and lays the grid from the house front to the sidewalk. The last two rows stay clear (the 5-ft setback); driveways, walks, beds and trunks are blocked.

Address selection compares house footprints and street frontage, uses Census side-of-street evidence, and treats an OpenStreetMap number as confirmation only when it lies on a plausible footprint. Duplicate nearby numbers remain unconfirmed. Ambiguous Census results and changed house numbers are rejected. Manually picking another house clears the original match claim. Roof slopes are fitted robustly so chimneys and branches do not inflate the roof; street snapping cannot substantially enlarge the footprint. Missing ground returns fail clearly, and narrow lawns cannot expand beyond their estimated boundaries.

The 3D renderer uses physical materials, procedural surface/bump textures, instanced grass and foliage, window trim and foundations, soft shadow maps and ACES tone mapping. Morning reflections use the locally shipped [Spruit Sunrise HDRI](https://polyhaven.com/a/spruit_sunrise) by Greg Zaal (CC0); night uses moon, porch and street lighting. Stationary scenes stop redrawing. Building geometry comes from survey data; finishes and window placement are illustrative, and lot edges are estimates. House numbers are not drawn on the model.

**Checking the house:** public records only give the block, so unless OpenStreetMap has that exact house number (then the pin is marked as matched), the house check says the pin is a best guess and shows the USGS aerial photo turned to match the model, with the picked house outlined. One to the left/right or tapping a house fixes a wrong pick.

Google data is deliberately not used to build the model: Google's terms forbid deriving models from its imagery. The lidar is from 2017, so newer additions may be missing; the "One to the left/right" buttons cover a wrong pick.

Test harness (not shipped): the survey module runs under Node with the network and decoders injected, so it can be checked against real addresses.

## Live site

**https://coreho.github.io/midnight-lawn-co/** (GitHub Pages, repo `Coreho/midnight-lawn-co`, served from `main`). Push to `main` and Pages redeploys in about a minute.

The claude.ai artifact copy is a preview only: its sandbox blocks every outside request, so "Their real yard" can't reach the Census, USGS or OpenStreetMap there. Its error message links to the live site.

## Run it

Serve the folder over HTTP. The 3D view is an ES module, and browsers block modules on `file://` pages:

```bash
python -m http.server 8080   # then open http://localhost:8080/#builder
```

Opening `index.html` directly works for everything except the builder's 3D stage.

The page needs internet access:

| Dependency | Source | Without it |
|---|---|---|
| GSAP 3.12.5 + ScrollTrigger | cdnjs | Everything still works, without animation |
| Three.js 0.160.0 | jsDelivr, loaded only when the 3D stage opens | The 3D stage shows a fallback message |
| Host Grotesk | Google Fonts | |

### Publish as a claude.ai Artifact

```bash
python tools/build_artifact.py   # writes dist/: the page without its wrapper tags, plus css/, js/ and img/
```

Then publish `dist/index.html` with these supporting files:
- `css/site.css`
- `js/app.js`, `js/decor.js`, `js/builder.js`, `js/render3d.js` and `js/yard-survey.js`
- `img/*`
- `assets/environments/*`

## Project layout

```
index.html                 all six views (hash-routed) and the SVG icon sprite
css/site.css               tokens (primitive -> semantic -> component) and styles, Lawn Builder included
js/app.js                  yard-letter rendering, letter math, spelling hints, booking flow, crew view, router, GSAP motion;
                           exposes window.MLC (prefill, stock check, dates, packages) for the builder
js/decor.js                the decoration catalog: 45 SVG pieces, letters A-Z 0-9 ! & ?, 10 ready-made messages
js/builder.js              Lawn Builder stages 1-3: shapes and sizes, the aerial grid, catalog, summary, hand-off to booking
js/render3d.js             Three.js scene (ES module, loaded on demand): the typical lawn or the surveyed yard (terrain, houses, roofs, trees, streets),
                           staked pieces, day and night rigs, cameras, and the 3D decorating grid
js/yard-survey.js          address -> yard model from Census, OpenStreetMap, USGS lidar and NAIP (ES module, no DOM needed)
img/                       cast.png (yard cutouts), crew.jpg, winter.jpg, og-share.png; generated images carry their prompt in metadata
banners/                   HTML sources for the share image and Facebook cover
assets/banners/            exported banners (1200x630 share image, 820x312@2x Facebook cover)
docs/brand-guidelines.md   voice chart, palette, type, logo rules, imagery rules, image provenance
docs/handoff.md            developer handoff: server contract for the FastAPI app, components, states, motion, a11y
docs/design-review.md      accessibility audit, detector results, finish reviews
PRODUCT.md                 product truth (impeccable)
DESIGN.md                  the built design system (written by impeccable's documenter)
.impeccable/               direction contract, quality-bar references, review screenshots
tools/build_artifact.py    builds dist/ for publishing
tools/yard-survey.test.mjs address selection, roof/footprint fitting, ground and setback regression checks
tools/check-render.cjs     browser smoke check (requires a local Playwright package and server on port 8080)
tools/check-address.cjs    live public-service survey and render check for a supplied address
assets/environments/       locally shipped 1K sunrise HDR and license/provenance
```

## How it was made

- **impeccable:**
  - **Redesign:** a full redesign from the first marquee version, aimed at "more fun, more trustworthy, delight in the first five seconds".
  - **Direction:** the direction roll, where you picked the "Objects on a lawn" challenger.
  - **Checks:** the craft floor, the design detector, independent finish reviews and DESIGN.md.
- **ui-ux-pro-max:** design-system search and the illustrations, made through its Nano Banana step via the Antigravity CLI (Google AI Pro plan).
- **frontend-design, brand, design-system, design, ui-styling, dataviz, banner-design:**
  - tokens;
  - voice;
  - component patterns;
  - crew-view stat tiles;
  - the share image and Facebook cover.
- **Review skills (accessibility-review, ux-copy, design-critique, design-handoff):** results are in `docs/`.
- **Checks run for this version:**
  - **axe-core 4.10.2:** 0 violations on every view and every builder stage, at desktop and phone widths.
  - **Headless Chrome:** captures at 1440 and 390, including the WebGL render.
  - **Builder hand-off:** tested end to end into the booking form.

## Sample data and assumptions

- **Letter stock:** two 84-piece 18-inch sets plus extra common letters (per the guide). The per-letter split in `js/app.js` is an assumption; replace it with the real counts once the sets arrive.
- **Calendar:** existing bookings are sample data. Saturdays are deliberately heavy on E so the shortage warning shows (try "Welcome home" on a Saturday).
- **Zones:** each city is mapped to a zone by rough distance from Lincoln Park. The real app should geocode the street address (see `docs/handoff.md`).
- **Lawn Builder:** lawn sizes are typical Downriver front yards, not survey data. The catalog art is drawn in the site palette as stand-ins for the real coroplast designs.
- **Name and contacts:** Midnight Lawn Co. is pending the LARA and Facebook name checks. The phone uses a 555 number and the email an `.example` domain. The footer leaves legal entity and insurance details pending.

## Next steps

1. Replace the illustrations and builder art with photos and scans of the real display pieces after the launch giveaway.
2. Build the FastAPI + Postgres back end against the contract in `docs/handoff.md`. Start with Stripe Payment Links, as the guide suggests. Save builder layouts with the booking, so the crew's pick list and placement plan come straight from the customer's design.
3. Test with NVDA and VoiceOver before launch, including the builder grid's arrow-key navigation.
