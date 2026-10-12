---
name: Midnight Lawn Co.
description: The page is the lawn, and everything is planted on it.
colors:
  green-400: "#94d671"
  green-500: "#82cc5c"
  green-600: "#6dbb47"
  green-700: "#4f9a2e"
  green-ink: "#1f6b2a"
  ink: "#2f3130"
  ink-soft: "#4a4d4b"
  white: "#ffffff"
  cream: "#f2efe3"
  cream-line: "#ddd7c4"
  tomato: "#f0574c"
  tomato-ink: "#b8352c"
  cobalt: "#1b8ff5"
  cobalt-ink: "#0a5fae"
  yellow: "#f5d42b"
  amber-ink: "#855700"
  paving-100: "#e8e4d6"
  paving-200: "#d8d2bf"
  paving-300: "#cfcabb"
  paving-400: "#bdb8a8"
typography:
  display:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(3rem, 7.2vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline-sm:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2rem, 3.6vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
  ui:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1
  small:
    fontFamily: "Host Grotesk, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.2
  yard-letter:
    fontFamily: "Chango, Host Grotesk, Segoe UI, sans-serif"
    fontSize: "clamp(2.4rem, 5.4vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0"
rounded:
  field: "16px"
  card: "28px"
  slab-top: "48px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "80px"
  gutter: "clamp(16px, 4vw, 40px)"
components:
  button:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 24px"
    height: "56px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 24px"
    height: "56px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 24px"
    height: "56px"
  button-small:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 18px"
    height: "48px"
  button-disc:
    backgroundColor: "{colors.green-500}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
    height: "52px"
  nav-capsule:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "8px 8px 8px 20px"
    height: "64px"
  slab:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.slab-top}"
    padding: "88px 0 80px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  price-disc:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "64px"
  tab:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  tab-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  stock-pill:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 14px 6px 6px"
---

# Design System: Midnight Lawn Co.

## Overview

**Creative North Star: "Objects on a Lawn"**

The page is one saturated, finely grained lawn-green field, and everything else is a thing planted on it: a floating white capsule nav, white pills, cream and white slabs that rise over each other on 48px top corners, and chunky yard letters staked into the grass. It is daytime, cheerful and tactile, the feeling of walking out the front door to find a name on the lawn. Composition is flush-left and never centred; density is generous, with big type and big touch targets.

One grotesque does everything. Colour is disciplined: green is the ground and the "go" signal, ink and white carry all reading, and the three toy-bright accents live only where an object would be painted (discs, the letters themselves, die-cut art). The Lawn Builder carries the same world into an aerial street map and a toon-shaded 3D render, so a customer's design looks like the site at every scale.

It explicitly rejects the earlier night marquee look (navy, condensed display type, lit panels) and the generic party-rental page (balloon clip-art on white, photo grids, three equal price cards).

**Key Characteristics:**
- Lawn-green grained ground with white and cream objects floating on it.
- Slabs with 48px top corners overlapping the section above.
- Pill buttons whose colour lives in a 40px green chevron disc.
- Yard letters in Host Grotesk 800, accent-filled with a white cut edge, soft shadow and wire stake.
- Flat, single-face typography; no caps labels, no mono.
- Springy, physical motion: letters drop and plant; reduced motion turns it off.

## Colors

A grass field, ink and paper for reading, and three toy-bright accents kept to painted objects.

### Primary
- **Lawn Green** (`green-500`): the ground of the whole page (`--ground`, layered under the SVG `--grain`), green slabs, the chevron disc in every button, current nav link, stock-pill and price discs at rest. Its steps do work: `green-400` and `green-600` stripe the aerial lawn and fill the service rings, `green-700` is the focus outline on choice cards and the `accent-color` of checkboxes, radios and ranges.
- **Deep Turf** (`green-ink`): the success text colour (`--ok`) and the boulevard strip on the aerial map. It is the only green that may carry text.

### Secondary
- **Tomato** (`tomato`): yard-letter fill (first of every four), a few icon wells, die-cut art. Text needing red uses **Brick** (`tomato-ink`) instead: errors (`--bad`), required marks, "short" stock, the active eraser tool, peak-season cells and the input caret.
- **Cobalt** (`cobalt`): yard-letter fill (second of every four), icon wells, the 3D front door. **Deep Cobalt** (`cobalt-ink`) is its ink-safe partner for text.

### Tertiary
- **Sign Yellow** (`yellow`): yard-letter fill (third of every four), the price discs and running totals, the featured-package disc, the selected FAQ disc, current-step disc, text selection, and the dashed road lanes. **Amber Ink** (`amber-ink`) carries warning text (`--warn`).

### Neutral
- **Ink** (`ink`): all text, ink buttons, selected tabs and segments, the road. Never pure black.
- **Soft Ink** (`ink-soft`): secondary copy, hints, definition terms (`--fg-soft`).
- **White** (`white`): capsules, cards, buttons, fields, the yard letters' cut edge, and the fourth letter fill.
- **Cream** (`cream`): the default slab, tabs, tiles, size pills, nav hover, step discs, the house on the aerial map.
- **Cream Line** (`cream-line`): field borders, card hairlines, dividers, choice-card rings (`--line`). On green, dividers use ink at 18% (`--line-on-green`).
- **Paving** (`paving-100` to `paving-400`): the aerial map's sidewalk slabs, roof pitch, driveway and curb lip only. Never UI chrome.

### Named Rules
**The Painted Object Rule.** Tomato, cobalt and yellow appear only on objects: discs, small pills and tags, yard letters, icon wells and die-cut art. They are never a section fill, never a large panel, never body or label text. Text that needs their hue uses `tomato-ink`, `cobalt-ink` or `amber-ink`.

**The Green Means Go Rule.** The chevron disc on every button is lawn green, including on ink buttons. Colour moves into the disc; the pill stays white or ink.

## Typography

**Display Font:** Host Grotesk (with Segoe UI, system-ui, sans-serif)
**Body Font:** Host Grotesk
**Label/Mono Font:** none; there is no second face

**Character:** One friendly grotesque, tightly tracked and heavy at the top, open at body size. Weights loaded: 400, 500, 600, 800.

### Hierarchy
- **Display** (600, `clamp(3rem, 7.2vw, 5.5rem)`, 0.95, -2%): the hero headline only. Interior page heads use `clamp(2.75rem, 6.5vw, 4.5rem)`.
- **Headline** (600, `clamp(2.4rem, 5vw, 3.5rem)`, 1, -2%): section titles (h2). Panel, builder-stage and FAQ-group heads drop to **headline-sm** (`clamp(2rem, 3.6vw, 2.25rem)`).
- **Title** (600, 22px, 1.2, -1%): h3, card titles, choice names, the lead paragraph size. 28px is used for summary and crew-card heads.
- **Body** (400, 20px, 1.45): running copy. Leads cap at 34rem; section heads at 44rem.
- **UI** (600, 17px, 1): buttons, field labels, FAQ questions. Secondary paragraphs inside cards also sit at 17px, weight 400.
- **Small** (500 to 600, 15px): nav-adjacent meta, tabs, tiles, steps, status in tight spots, chips. Nav links are 500.
- **Yard letter** (800, `--ltr`, 1): only inside the letter display and builder pieces; the person's name (`.ltr.red`) scales to 1.35x (1.5x in the hero).

Scale: 15 / 17 / 20 / 22 / 28 / 36 / 56 / 88 (`--t-sm` to `--t-hero`). Numbers that change use `font-variant-numeric: tabular-nums`.

### Named Rules
**The One Face Rule.** Host Grotesk at 400, 500, 600 and 800 is the entire interface type system. No uppercase tracked labels, no monospace. The one exception is the product itself: the yard letters are set in Chango (owner's pick, 2026-10-12, replacing Host Grotesk 800), and Chango appears nowhere else.

**The Biggest Name Rule.** The person's name in yard letters is the largest type on the page, larger than the headline.

## Layout

A single centred wrap (`--wrap` 1200px, `--gutter` `clamp(16px, 4vw, 40px)`) inside full-bleed slabs. Text stays flush-left. Each section is a slab that pulls up 48px (`margin-top: calc(var(--slab-top) * -1)`) to rise over the previous one, padded 88px top and 80px bottom; green, cream and white slabs alternate. A green slab may carry the swelling lawn lobe, a grassy dome over its top edge.

The nav is sticky 10px below the safe area: a flexible white nav capsule plus a detached CTA capsule. The hero stacks intro, the white booking-start capsule (60% width, max 660px) and the yard-letter lawn, with the illustrated cast absolutely placed at the right and a turf edge where the stakes meet grass.

Grids are content-driven: 2-column splits, 3-column occasions, 4-column clock, booking at `1fr 360px`, FAQ at `1fr 340px`, builder editor at `1fr 340px`. The spacing scale is 4 / 8 / 12 / 16 / 24 / 32 / 48 / 80.

Breakpoints (max-width unless noted): 1100 (builder bar wraps), 1000 (booking, FAQ and crew go single column), 960 (nav collapses into the menu disc), 921 min / 920 (hero reflows, cast moves under the form), 900 (most two-column grids stack; the catalog docks to the bottom of the screen as a sideways tray), 760 (shape cards to 2 columns), 700, 620 (forms and builder bar to one column; aerial goes edge to edge), 560 (CTA shortens), 520, 480, 440 (CTA drops its disc; booking start one column), 400 (smaller logo).

## Elevation & Depth

Mostly flat: objects separate from the grass by colour, not by shadow. One soft ambient shadow lifts the things that float (the nav and CTA capsules, white buttons, the door card, segment controls, toasts). Rings drawn with inset box-shadows (`cream-line` at rest, ink when selected) do the work borders would do. The yard letters carry their own small soft drop shadow and a stake, so they read as standing in the grass.

### Shadow Vocabulary
- **Float** (`--shadow-soft`: `0 10px 30px -14px rgba(47, 49, 48, .35)`): capsules, white buttons, segment controls, door card, toast.
- **Docked tray** (`0 -8px 30px -12px rgba(47, 49, 48, .4)`): the catalog when docked to the bottom on phones.
- **Letter lift** (`drop-shadow(0 .05em .04em var(--letter-shadow))`): yard letters and letter pieces.
- **Ring** (`inset 0 0 0 2px var(--line)`, selected `inset 0 0 0 3px var(--ink)`): choice cards, shape cards, stock pills, tools, ghost buttons.

### Named Rules
**The Float Only Rule.** Only things that hover over the lawn (nav, CTA, buttons, the door card, overlays) get the soft shadow. Cards resting on a slab stay flat.

## Shapes

Everything is rounded and soft-edged, like cut coroplast. Three radii plus the slab corner: field 16px, card 28px, pill 999px, slab top 48px. Circles are everywhere as discs: the 40px chevron disc, 64px price discs, 112px time discs, 76px ETA discs, 44px icon wells. The aerial map, tiles and shot thumbnails use smaller inner radii (14 to 18px). Dashed lines mark something incomplete: a short letter's dashed brick outline, the door card's dashed note rule.

## Components

### Buttons
Tactile pills with the colour packed into a disc.
- **Shape:** pill (999px), 56px tall, label left and 40px disc right.
- **Primary:** white pill, ink 600 17px label, green chevron disc, soft float shadow.
- **Ink:** ink pill, white label, green disc, no shadow; the main booking action.
- **Ghost:** transparent with a 2px inset ink ring, no disc padding.
- **Small:** 48px tall, 15px label, 32px disc.
- **Hover / Focus / Active:** the disc slides 4px right and grows to 1.08 on `--ease-over`; active scales the pill to .98; focus is a 3px ink outline over a 2px white halo. Disabled drops to 50% opacity.

### Chips, tags and stock pills
- **Chip:** white pill with a green numeric mini-disc at the left. **Tag:** small yellow pill with 600 15px text.
- **Stock pill (`.tray` / `.slot`):** white pill, 1.5px cream-line ring, 36px green letter disc and a tabular count. Low stock turns the disc yellow with amber text; short turns it brick with brick text. Counts tick when they change.

### Cards / Containers
- **Corner Style:** 28px.
- **Background:** white on cream slabs, white or cream on green.
- **Shadow Strategy:** flat (see the Float Only Rule).
- **Border:** none, or a 2px inset ring for selectable cards.
- **Internal Padding:** 16 to 32px.
- **Package card (`.choice`):** 22px corners, cream-line ring, 600 22px name with a green price mini-pill; checked becomes a 3px ink ring and a yellow mini-pill.

### Inputs / Fields
- **Style:** white, 2px `cream-line` border, 16px radius, 52px tall, 400 17px ink text, soft-ink placeholders.
- **Focus:** border goes ink with a 3px lawn-green outline.
- **Error:** border brick (`--bad`) and a brick 600 15px message with icon. Letter-entry fields (sign input, word maker) set their text in uppercase to mirror the sign.

### Navigation
- **Style:** a white 28px-radius capsule (logo, links, menu disc) inset from the edges, beside a detached white CTA capsule with a green disc. Links are 500, pill-shaped on hover (cream) and current (lawn green). Under 960px the links fold into a white dropdown card opened by a 48px cream menu disc; under 560px the CTA uses its short label, under 440px it drops the disc.

### Steps, status and discs
- **Steps:** three white pills with a 32px disc; current is ink-ringed with a yellow disc, done gets a green disc; on phones only the current step shows its name.
- **Status lines:** icon plus text in `ok`, `warn`, `bad` or soft ink.
- **Time discs:** 112px green circles (the second is ink) holding the time. **Service rings:** concentric green-400 / green-600 / cream rings with a yellow home marker.
- **Partner list:** one white card, rows split by 2px cream-line rules.

### Yard Letters (signature)
The product, drawn in type. `.panel` holds `.word` groups of `.ltr` letters in Chango (`--font-letter`), cycling this season's Halloween paint per word: pumpkin `#f2711c`, witch purple `#7a3fb0`, ink, bone `#f4ede0` (bone letters take a thin ink edge), with a 0.1em white cut stroke painted under the fill, a soft drop shadow and a 3px wire stake. The name (`.ltr.red`) is enlarged. Letters the stock cannot cover (`.short`) fade to 38% inside a dashed brick outline. Sizes: default, `.compact`, `.tiny`; `.plot` sits the panel on its own green plot.

### Lawn Builder (signature)
- **Shape and size:** white shape cards with a mini plan and 22px corners, ink-ringed when chosen; cream size pills that turn ink when chosen.
- **Aerial grid (`.aerial`):** the street from above, scaled by `--cell` (44px). Areas house, drive, grid, walk, strip and road (a corner lot swaps the drive for a side street). Lawn cells stripe green-500 / green-400 every two cells with faint white seams; setback cells are hatched in ink at 14%; the meter is a cream disc ringed ink and yellow; the road is ink with yellow dashes. Pieces are yard letters or die-cut art at cell size.
- **Catalog:** a white card with the running total (price disc), cream theme tabs (ink when selected), cream tiles (white with ink ring when pressed), the word maker, message presets and ringed tool pills (the active eraser goes brick). Sticky at 96px on desktop; under 900px it docks to the bottom as a tray with sideways-scrolling tiles and icon-only tools.
- **Summary bar (`.b-bar`):** a white card with total, night picker, notes and actions.
- **3D stage:** an ink-backed 16:9 canvas (4:3 on phones) with a white illustration chip top-left and white segment controls (selected segment ink) for time of day and camera; a strip of white photo cards below.

### Motion
GSAP. Hero letters drop from -120px with `back.out(1.7)`, staggered 0.05s; typed letters drop with `back.out(1.8)`; stock counts tick with `back.out(2)`. Builder pieces "plant" (from y -18, scale 1.25, `back.out(2)`). Stage and step changes fade up 14px on `expo.out`; prices pop from 1.3 scale. The green slab lobe is scrubbed by ScrollTrigger. 3D camera and light changes tween 0.9s `power2.inOut`. CSS easing tokens: `--ease-out` `cubic-bezier(.16, 1, .3, 1)`, `--ease-over` `cubic-bezier(.34, 1.56, .64, 1)`. `prefers-reduced-motion: reduce` disables all of it.

## Do's and Don'ts

### Do:
- **Do** keep the lawn-green grained ground (`--grain` over `--ground`) as the page's base, and make every surface an object on it: capsule, pill, slab, card, letter.
- **Do** start each section as a slab with 48px top corners that overlaps the previous one.
- **Do** put a button's colour in its 40px green chevron disc; keep the pill white or ink.
- **Do** keep tomato, cobalt and yellow to discs, yard letters, icon wells and die-cut art; use `tomato-ink`, `cobalt-ink` and `amber-ink` for any coloured text.
- **Do** set everything in Host Grotesk: 400 body, 500 nav, 600 headings and UI, 800 yard letters.
- **Do** keep text flush-left.
- **Do** render the 3D scene from the site palette (lawn, ink, cream, white and the three accents) with `MeshToonMaterial` on the three-band ramp, so it reads like the flat vector art.
- **Do** gate every GSAP tween on `prefers-reduced-motion`.

### Don't:
- **Don't** use tomato, cobalt or yellow as a section background, a large panel fill, or body or label text.
- **Don't** float an object off the lawn: yard letters stand on stakes in the grass, art pieces sit on lawn cells, and the hero letters meet the turf edge.
- **Don't** add a dark mode or a dark UI theme; the interface is one committed daytime look (`color-scheme: light`). The 3D render's night lighting is a scene state showing the product's overnight setting, not a UI theme.
- **Don't** put the company name or logo on the yard display itself; the brand lives on the door card.
- **Don't** use photoreal or smooth-shaded materials, or new saturated hues, in the 3D scene; built surfaces come from the site palette plus the paving neutrals already on the aerial map.
- **Don't** use pure black; ink is `#2f3130`.
- **Don't** add uppercase tracked labels, monospace text or a second typeface.
- **Don't** centre-align body copy or section heads.
