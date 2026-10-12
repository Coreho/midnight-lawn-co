# Handoff spec: Midnight Lawn Co. site to booking app

_Last updated: 2026-10-11_

## Overview

This mockup is the front end for the booking app your guide plans: FastAPI + Postgres on your VPS, Stripe Checkout, OSRM routing and OR-Tools route ordering. Every view already works in the browser on sample data in `js/app.js`. This spec says what each piece needs from the server.

| View | Route | Mode | Who uses it |
|---|---|---|---|
| Home | `#home` | Sell the service, with the start of a booking built in | Buyers, mostly on phones |
| Lawn Builder | `#builder` | 3-stage design tool: lawn, decorate, see it in 3D | Buyers who want to see it first |
| Booking | `#book` | 3-step form | Buyers |
| Fundraisers and partners | `#groups` | Sell to groups, plus an interest form | PTOs, realtors, shops |
| FAQ | `#faq` | Reference | Everyone |
| Crew dashboard | `#crew` | The nightly working tool | The owner |

In the real app, give each view its own URL (`/builder`, `/book`, `/crew` behind a login). The hash routing exists only so the mockup works as a single file.

## Server contract the UI expects

| UI moment | Endpoint (suggested) | Request | Response | Mockup source |
|---|---|---|---|---|
| Hero, step 1 and builder letter check, on every change (debounce 250 ms) | `GET /api/availability?msg=&night=&nights=` | message, setup date, nights | `{need: {A: 4,...}, free: {A: 7,...}, short: ["E"]}` | `checkStock()` (shared with the builder as `window.MLC.checkStock`) |
| Price summary | `GET /api/quote?pkg=&night=&extra=&city=` | as named | `{base, extraDays, zoneFee, rush, total}` | `quote()` |
| Spelling hints | client-side is fine | n/a | n/a | `spellSuggestions()` |
| Builder: book this lawn | `POST /api/layouts` (or a `layout` field on the booking) | `{shape, size, cols, rows, pieces: [{c, r, kind: "letter" \| "item", ch?, id?}]}` | `{layoutId}`, then open booking prefilled | `MLC.prefill({msg, night, pkg})` in `js/builder.js` |
| Step 3 submit | `POST /api/bookings` | message, package, night, extra days, city, street, home type, landlord OK, buried lines, notes, resident flag, accomplice name and phone, buyer name and email, rule checkboxes, remind-next-year, optional `layoutId` | `{orderId, checkoutUrl}`, then redirect to Stripe Checkout | submit handler |
| Stripe webhook | `POST /api/stripe/webhook` | `checkout.session.completed` | Reserves the letters and puts the job on the route | none |
| Crew dashboard | `GET /api/crew/tonight` | owner session | stops, pick lists, tray counts, takedowns, and the layout grid when one was saved | `renderCrew()` |
| Group and giveaway forms | `POST /api/leads` | type, email, note | 201 | `simpleForm()` |

**Letter math (the feature off-the-shelf booking tools lack).** A display uses its letters from the setup night through the takedown evening. For a booking spanning nights `N..N+k-1`, the free count per letter is the stock minus the busiest overlapping night's usage. Recheck in the webhook before reserving, because two buyers can race for the same E. On a race, refund automatically and email the buyer.

**Builder layouts are the crew's placement plan.** The grid is 2.5-ft squares, read from the house (row 0) toward the street. The two rows nearest the sidewalk are the 5-ft setback and never hold pieces. Print the saved grid on the job sheet so setup matches what the buyer designed.

**Business rules to enforce on the server.** The client only previews these:

| Rule | Value |
|---|---|
| Classic | $95, 1 night, at most 22 letters, 2 graphics |
| Deluxe | $145, 2 nights, at most 32 letters, 4 or more graphics, optional age or year |
| Flocking | $75, 1 night, 24 flamingos, no letters |
| Extra day | +$25 each, up to 3 |
| Rush | +$20 when the setup (11 PM on the chosen night) is under 48 hours away |
| Zones | Zone 1 $0 (within 10 mi), Zone 2 +$15 (within 20 mi), Zone 3 +$30 (rest of Wayne County).<br>Distance is measured from the Lincoln Park base. The mockup maps cities to zones; the real app should geocode the street address with Nominatim or the US Census geocoder. |
| Characters | A to Z, 0 to 9, `! & ?` |
| Inventory (builder caps) | Two 84-piece letter sets plus extras, about 25 theme graphics, 24 flamingos |
| Placement | 5 ft back from the sidewalk; never on the city strip by the curb |
| Consent | An accomplice's name and 10-digit cell are required unless the buyer lives there; rentals and apartments need landlord or HOA okay |
| Do-not-deliver | Check the address and the buyer against the list before accepting |
| Floor | Never discount the Classic below $85 |

## Layout

- **Page:** one lawn-green field with grain. Content sits in `.wrap`: 1200px max, side gutter clamp(16px, 4vw, 40px).
- **Sections:** sections are `.slab`s (cream, `.green` or `.white`) with 48px top corners. Each pulls up 48px over the one before, so they read as objects laid on the lawn. A green slab can carry a `.lobe`, a grassy dome that grows with scroll.
- **Nav:** a floating white capsule (logo and nav) beside a separate CTA capsule, sticky 10px from the top.
- **Breakpoints:**

| Width | What changes |
|---|---|
| 1100px | Builder summary bar wraps to two rows |
| 1000px | Booking and FAQ sidebars stack |
| 960px | Nav collapses to the menu disc |
| 920px | Hero becomes one column |
| 900px | Splits, prices and footer reflow; the builder catalog docks to the bottom of the screen as a sideways tray |
| 760px | Shape cards go to 2 columns |
| 620px | Form grids go to one column; step pills collapse to discs; 3D controls move under the canvas; the canvas becomes 4:3 |
| 560px | Nav CTA becomes "Book" |
| 440px | Nav CTA loses its disc so the nav fits 360px phones |
| 400px and below | Small-phone tweaks |

## Design tokens used

Full set in `css/site.css`, in three layers (primitive, semantic, component). There is one daytime theme.

| Token | Value | Use |
|---|---|---|
| `--ground` (`--green-500`) | `#82CC5C` + `--grain` | Page ground, green slabs, button discs |
| `--green-400` / `-600` / `-700` | `#94D671` / `#6DBB47` / `#4F9A2E` | Mowing stripes, aerial yard, city strip |
| `--fg` (`--ink`) / `--fg-soft` | `#2F3130` / `#4A4D4B` | Text |
| `--surface` (`--white`) | `#FFFFFF` | Capsules: nav, forms, cards, catalog |
| `--slab` (`--cream`) / `--line` | `#F2EFE3` / `#DDD7C4` | Slabs, quiet fills / borders |
| `--tomato` `--cobalt` `--yellow` | `#F0574C` `#1B8FF5` `#F5D42B` | Letters, discs, art only |
| `--ok` `--warn` `--bad` | `#1F6B2A` `#855700` `#B8352C` | Status, always with an icon and words |
| `--font` | Host Grotesk | Everything: 400 / 500 / 600 / 800 |
| `--t-sm` … `--t-hero` | 15, 17, 20, 22, 28, 36, 56, 88px | Type scale |
| `--s-1` … `--s-8` | 4, 8, 12, 16, 24, 32, 48, 80px | Spacing |
| `--slab-top` / `--radius-card` / `--radius-field` / `--radius-pill` | 48 / 28 / 16 / 999px | Corners |
| `--ease-out` / `--ease-over` | cubic-bezier(.16,1,.3,1) / (.34,1.56,.64,1) | Transitions; the overshoot is only for the button disc nudge |

## Components

| Component | Variants | Key states | Notes |
|---|---|---|---|
| `.btn` | default (white), `.ink`, `.ghost`, `.small` | hover (disc nudges right), active (scale .98), disabled (50%) | Pill with the label left and a green chevron `.disc` right. The checkout button swaps its label to "Opening checkout…" and disables itself while loading |
| `.slab` | cream, `.green`, `.white` | n/a | 48px top corners, overlapping the slab above |
| `.panel` > `.word` > `.ltr` (yard letters) | hero (`.hero-lawn`), compact (examples, summary) | `.red` (the name, larger), `.short` (dashed outline, 38% opacity) | Host Grotesk 800, colored fill with a white stroke, a drop shadow and a stake. Any `.panel[data-msg][data-red]` renders itself on load |
| `.tray > .slot` (letter stock) | customer, crew | ok, `.low` (yellow), `.short` (tomato ink) | White pills with a letter disc and a count. The customer view only flags real shortages |
| `.choice` (package card) | 3 packages | checked (3px ink ring), keyboard focus ring | A native radio underneath |
| `.steps` | booking, builder | current (ink ring, yellow disc), done (green disc) | Below 620px only the current step shows its name |
| `.status` | ok, warn, bad, info | n/a | Icon plus sentence; never color alone |
| `.time-disc` (night clock) | n/a | n/a | 112px disc with a time and a small second line |
| `.rings` (service area) | n/a | n/a | SVG rings with a `<title>` description |
| `.partner-list` | n/a | n/a | One row per partner type |
| **Builder** `.shape-card`, `.size-pill` | 4 shapes, 3 sizes | checked (ink ring / ink fill), focus ring | Native radios underneath |
| **Builder** `.aerial` | `.shape-standard`, `-wide`, `-narrow`, `-corner` | n/a | CSS grid scaled by `--cell` (32 to 56px, fitted to the column).<br>Areas: house, drive, grid, walk, strip, road, plus a side street on corner lots. |
| **Builder** `.cell` | open, `.filled`, `.blocked.setback`, `.blocked.house`, `.blocked.meter` | hover, focus (ink ring inside), dragging | Open cells are buttons; blocked cells are inert spans. Roving tabindex |
| **Builder** `.catalog` | 6 tabs: Seasonal, Letters, Emojis, Icons, Messages, Clip-art | tile `aria-pressed`; eraser pressed (tomato ink) | Letters tab has a word maker; Messages place a whole phrase from the tapped square |
| **Builder** `.b-bar` | n/a | render button disabled when the lawn is empty | Price disc, package name, counts, setup night, stock notes |
| **Builder** `.render-stage` | day, night; `.no-3d` fallback | angle and time `.seg` buttons `aria-pressed` | `<canvas>` 16:9 (4:3 on phones) with controls overlaid; `.shots` strip of 5 stills |

## States and interactions

| Element | State | Behavior |
|---|---|---|
| Hero name, occasion, night | input | Re-renders the yard letters (new ones drop in), stock pills, price and status line |
| Step "Next" buttons | invalid | Inline error under each field, a linked error summary at the top (focused), `aria-invalid` on fields |
| Step change (booking and builder) | valid | Next panel fades and rises 14px in 0.4s with expo ease-out; focus moves to its heading |
| Spelling hint | likely typo | "Did you mean BIRTHDAY instead of BRITHDAY?" with a one-tap fix button |
| Short letters | any step, builder bar | Red status naming the letters and how many are missing. Step 1 and step 2 both block until fixed |
| Builder shape or size | change | The example layout is re-seeded to fit, until the visitor edits the lawn; after that, only pieces that no longer fit are dropped |
| Builder catalog piece | tap | Selects it as the brush (tap again to drop it); the live line says what a tap on the lawn will do |
| Builder cell | tap, Enter or Space | Places the brush. A message needs enough open squares to the right, otherwise it says so and places nothing |
| Builder cell | drag (mouse) | Moves a placed piece to an empty square; a catalog tile can be dragged straight onto the lawn |
| Builder cell | arrow keys, Delete or Backspace | Moves focus across open squares; removes the piece |
| Builder tools | Eraser, Undo (60 steps), Clear lawn | Clear can be undone |
| Builder bar | any change | Package, price and counts update; caps warn at 32 letters, about 25 theme pieces or 24 flamingos |
| 3D stage | open | Loads Three.js on demand, builds the scene, renders the 5 stills, then shows the live view (night first; phones start on "Up close") |
| 3D canvas | drag | Orbits around the current target, ±72° |
| Book this lawn | click | Prefills booking with message, night and package, then routes to `#book` |
| Mobile menu | open | Escape or picking a link closes it; `aria-expanded` stays in sync |
| Copy buttons | click | Clipboard, falling back to selecting the text; toast for 3.5s |

## Edge cases

- **Empty message:** an inline error ("Type the message for the sign."). Flocking shows an empty-sign note instead of letters.
- **Long messages:** letter-count error past the package limit (22 or 32). Words never break; letters wrap by word.
- **Past date:** "That night has passed. Pick tonight or later."
- **No city:** travel shows "Pick a city" and the total excludes it.
- **Slow network:** the real availability call should keep the last result, and show "Checking letters…" only after 300 ms, so there's no spinner flash.
- **Inventory race:** see letter math above.
- **Builder, empty lawn:** the price shows $0, the package line reads "Nothing on the lawn yet", and "See it in 3D" is disabled.
- **Builder, lawn wider than the screen:** the aerial scrolls sideways with a "Scroll the lawn sideways" hint; cells never shrink below 32px.
- **Builder, shrinking the lawn:** pieces outside the new grid or on blocked squares are dropped.
- **3D unavailable:** if WebGL or the Three.js download fails, the stage keeps the canvas dimmed and says the 3D view couldn't start. The plan is kept.
- **Fonts fail to load:** the fallback is Segoe UI or the system UI font; the 3D letter textures wait for Host Grotesk before drawing.

## Animation and motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Hero letters | first load | Drop in from -120px with fade, staggered | 0.6s, 0.05s stagger | back.out(1.7) |
| Hero stock pills | first load | Fade and rise 10px, staggered | 0.3s, 0.025s stagger | power2.out |
| Yard letters | typing | New letters drop in from -80px | 0.5s, 0.035s stagger | back.out(1.8) |
| Green slab lobe | scroll | Grows from 20% to full height | scrubbed | none |
| Booking and builder stage | Next or Back | Fade and rise 14px | 0.4s | expo.out |
| Builder piece | placed or moved | Drops in from -18px at 125% scale | 0.4s, 0.03s stagger | back.out(2) |
| 3D camera | angle change | Position and target tween | 0.9s | power2.inOut |
| 3D lighting | time change | Light, window glow and stars tween | 0.9s | power2.inOut |
| Button disc | hover | Nudges 4px right at 108% | 0.4s | `--ease-over` |

Under `prefers-reduced-motion: reduce`, the following are all off:
- gsap.matchMedia skips the load sequence and the per-change motion;
- the 3D camera and lighting jump instead of tweening;
- CSS transitions drop to 0.01ms.

GSAP 3.12.5 comes from cdnjs. If it fails to load, the page works with no motion.

## Accessibility notes

- **Focus order:** skip link, the mockup notice link, logo, nav, then main. Focus moves to the h1 on view change and to the stage heading on step change (programmatic focus targets show no ring).
- **Landmarks:** `aside` (mockup notice), `header`, `nav`, `main`, `footer`. The builder catalog is a labelled `group`, not a landmark.
- **Yard letters:** `role="img"` with `aria-label="Sign preview: HAPPY BIRTHDAY MAYA"`. Each stock pill is announced as "A: needs 4, 7 free that night".
- **Builder grid:** a labelled group ("Lawn grid, 16 squares across and 5 deep you can decorate…") with one tab stop. Arrow keys move between open squares. Each square is labelled "Row 2, square 5: letter A" or "empty". Catalog tabs are a `tablist` with arrow-key movement, and tiles are toggle buttons (`aria-pressed`).
- **Live regions:**
  - the hero result;
  - the step 1 checks;
  - field errors;
  - the builder's action line and stock notes.
  
  All use `aria-live="polite"`.
- **3D:** the canvas has an `aria-label`. Everything it shows is also in the grid and the summary. The photo strip buttons are named by their visible captions.
- **Targets:** 44px minimum on buttons, tabs, tools and segment buttons; 48px inputs; builder cells are 32px minimum. Copy buttons are 32px, which meets the 24px AA target size.
- **axe-core 4.10.2:** 0 violations across all views and all three builder stages, at 1280px and 390px (see `docs/design-review.md`).
