# Midnight Lawn Co. Brand Guidelines v0.2

_Last updated: 2026-10-11_

This is a draft for the website mockup. The name is pending a check in Michigan's LARA business entity search and on Facebook. The source for every business fact is the *Surprise Lawn Decorating Business, Wayne County Startup Guide* (Oct 9, 2026).

v0.2 replaces the v0.1 night-marquee identity. The redesign was aimed at three things: more fun, more trustworthy, and delight in the first five seconds.

## Quick reference

| | |
|---|---|
| Name | Midnight Lawn Co. |
| Line | Wake up to their name on the lawn. |
| Idea | Objects on a lawn. The page is a grassy field; everything stands on it, like the yard letters we stake into someone's grass overnight |
| Personality | Cheerful neighbor with a night shift. Fun in the morning, plainly legitimate at all hours |
| Type | Host Grotesk throughout: 400 body, 600 headings and UI, 800 for yard letters |
| Core colors | Lawn `#82CC5C`, ink `#2F3130`, white `#FFFFFF`, cream `#F2EFE3` |
| Accents | Tomato `#F0574C`, cobalt `#1B8FF5`, yellow `#F5D42B`, only in discs, letters and art |

## 1. Color palette

The tokens live in `css/site.css` in three layers: primitives, then semantic roles, then component values.

### Ground and surfaces

| Name | Hex | Use |
|---|---|---|
| Lawn | `#82CC5C` with a fine grain | The page ground, green slabs, button discs, current nav item |
| Lawn light / mid / deep | `#94D671` / `#6DBB47` / `#4F9A2E` | Mowing stripes, the aerial yard around the builder grid, the city strip |
| Ink | `#2F3130` | All text, dark pill buttons, outlines on drawn art |
| White | `#FFFFFF` | Capsules: nav, cards, forms, the catalog |
| Cream | `#F2EFE3` | Slabs that rise over the lawn with 48px top corners; quiet fills (tabs, tiles, step discs) |
| Cream line | `#DDD7C4` | Field borders and inactive outlines |

### Accents

| Name | Hex | Use |
|---|---|---|
| Tomato | `#F0574C` | Yard letters, the house chimney in the aerial, art |
| Cobalt | `#1B8FF5` | Yard letters, art |
| Yellow | `#F5D42B` | Price discs, the current step, the moon in the logo, road lane marks |

Accents never fill large areas or carry body text. Where an accent has to hold text, use the ink-safe steps:

| Name | Hex | Use |
|---|---|---|
| Tomato ink | `#B8352C` | Errors and short-stock warnings, the active eraser |
| Cobalt ink | `#0A5FAE` | Small text on cobalt-tinted parts |
| Green ink | `#1F6B2A` | Success messages |
| Amber ink | `#855700` | Warnings |

### Accessibility

Body text is at least 4.5:1 against its ground. Ink on lawn green is 6.7:1, ink on cream 11.4:1, and tomato ink on white 5.9:1. Status colors (good, warning, short) always come with an icon and a word, never color alone. White letters get an ink outline so they hold up on white and cream.

## 2. Typography

| Role | Face | Notes |
|---|---|---|
| Headings, UI, prices, buttons | Host Grotesk 600 | Sentence case. Headings tighten to -0.02em. |
| Body, forms | Host Grotesk 400 | 20px body, 17px in forms, 15px for hints. |
| Yard letters | Host Grotesk 800 | Colored fill with a white stroke (white letters get an ink stroke), a soft drop shadow and a stake. |

There is no monospace face and no all-caps labels. Numbers in prices and tables use tabular figures.

Type scale (px): 15 / 17 / 20 / 22 / 28 / 36 / 56 / 88.

## 3. Logo usage

The logo is a lawn-green disc holding a yellow crescent moon with an ink outline, followed by "Midnight Lawn Co." in Host Grotesk 600.

- **Clear space:** at least the disc's radius on every side.
- **Minimum size:** a 28px disc.
- **Wordmark:** never wraps.
- **Never on the yard display itself.** Branding goes only on the take-down card at the door, the hi-vis vest and the car magnet. Logos on the display count as advertising signs under Detroit's sign rules, and the display belongs to the recipient.
- **Don't:**
  - recolor the moon or the disc;
  - set the wordmark in another face;
  - add glows or gradients;
  - place it on a busy photo without a white capsule behind it.

## 4. Voice and tone

### We are

- **Fun first.** The point is the morning someone sees their name in the grass.
- **Plain and legitimate.** Rules, prices and removal are stated flatly, with no wink.
- **Neighborly.** Downriver, not corporate. We name real places: Lincoln Park, Southgate, Fort Street.
- **On the house's side.** The person who lives there always wins.

### Voice chart

| Trait | Do | Don't |
|---|---|---|
| Night crew | "We set up between 11 PM and 3 AM." | "Our ninjas strike under cover of darkness!" |
| Legitimate | "Our crew wears a hi-vis vest with our name on it." | "Totally stealth, no one will ever know." |
| Plain | "No reply, no setup." | "We leverage resident-consent workflows." |
| Kind | "Not a fan? It's gone within two hours." | "No refunds, no exceptions." |

### Tone by context

| Context | Tone |
|---|---|
| Hero and social posts | Playful and short |
| Lawn Builder | Friendly and instructive. Say what a tap does, and say why a square is blocked ("5 ft from the sidewalk: no stakes") |
| Booking form | Clear and procedural; errors say what's wrong and how to fix it |
| House rules and removal | Calm, flat and generous |
| Crew dashboard | Terse job-sheet language |

### Prohibited

- Stalking-adjacent jokes ("we know where you live", "they'll never see us coming").
- "Prank" for anything aimed at someone who didn't agree.
- Team names and logos, and invented reviews, customers or ratings.

## 5. Imagery

- **Illustrations:**
  - Flat, cheerful scenes in the palette above, with simple cutout shapes.
  - No text, letters or logos baked in, because generated lettering misspells and misspelling is this business's top complaint.
  - The current set in `img/` was generated for the mockup (provenance below). It gets replaced by real display photos after launch.
- **Lawn Builder art:** hand-built SVG in `js/decor.js`, as flat shapes with 3px ink outlines in the same palette. The 3D view reuses the same art as die-cut textures on wire stakes, so a piece looks the same in the catalog, on the grid and on the lawn.
- **Photos (after launch):**
  - Subjects: the morning reveal and the 2 AM "mission complete" shot, taken from the sidewalk.
  - Never show house numbers, license plates, or the faces of minors unless the parents agree.
- **Icons:** one stroked line family (2.2px, round caps), drawn as an inline SVG sprite.

### Image provenance

| File | Source |
|---|---|
| `img/cast.png`, `img/crew.jpg`, `img/winter.jpg` | Generated 2026-10-11 with the Antigravity CLI image generator (Google AI Pro plan) through `ui-ux-pro-max/scripts/nano_banana.py`. Each file's prompt is recorded in its metadata (`impeccable:prompt`). `cast.png` was background-keyed and color-quantized for the hero. |
| `img/og-share.png`, `assets/banners/*` | Rendered from the HTML in `banners/` with headless Chrome |
| Builder catalog (`js/decor.js`) | Drawn as SVG for the mockup |
| 3D scene (`js/render3d.js`) | Built in code with Three.js 0.160.0 |
