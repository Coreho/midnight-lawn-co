# Design review: Midnight Lawn Co. mockup

_Last updated: 2026-10-11_

This doc collects the review results for the "objects on a lawn" redesign and the Lawn Builder: the accessibility audit, impeccable's detector, and impeccable's independent finish reviews. The v0.1 marquee-sign reviews are superseded and were removed.

## Accessibility audit

**Standard:** WCAG 2.1 AA, plus the 2.2 target-size rule.
**Date:** 2026-10-11.
**Method:**
- **Automated:** axe-core 4.10.2 in headless Chrome, at 1280px and at 390px with touch emulation. It covered all six views and every Lawn Builder stage: lawn, decorate (with the Seasonal, Letters and Messages tabs open), and the 3D render.
- **Contrast:** a table computed from the tokens.
- **Code review:** keyboard and screen-reader behavior.

Not yet tested with NVDA or VoiceOver by a person.

### Summary

**axe-core: 0 violations on every view and stage, at both widths.**

Issues found and fixed during this round:

| # | Issue | WCAG | Severity | Fix |
|---|---|---|---|---|
| 1 | The builder catalog was an `<aside>` inside `main` | best practice (landmark-complementary-is-top-level) | Minor | Now a labelled `role="group"` |
| 2 | Photo-strip images repeated their visible captions as alt text | best practice (image-redundant-alt) | Minor | `alt=""`; the caption names the button |
| 3 | White "City strip, never used" label on lawn green 700 was 3.5:1 | 1.4.3 Contrast | Major | The strip is now `--green-ink` (6.6:1) |
| 4 | The nav overflowed 390px phones by 32px, which made the whole page scroll sideways | 1.4.10 Reflow | Major | At 440px and below the CTA is a text-only "Book" pill |

### Color contrast

| Element | Foreground | Background | Ratio | Needs | Pass |
|---|---|---|---|---|---|
| Body text on the lawn | `#2F3130` | `#82CC5C` | 6.7:1 | 4.5 | ✅ |
| Body text on a cream slab | `#2F3130` | `#F2EFE3` | 11.4:1 | 4.5 | ✅ |
| Soft text on white / cream | `#4A4D4B` | `#FFFFFF` / `#F2EFE3` | 8.6 / 7.4 | 4.5 | ✅ |
| White on ink button | `#FFFFFF` | `#2F3130` | 13.1:1 | 4.5 | ✅ |
| Ink on yellow price disc | `#2F3130` | `#F5D42B` | 8.9:1 | 4.5 | ✅ |
| Error / short on white | `#B8352C` | `#FFFFFF` | 5.9:1 | 4.5 | ✅ |
| Success on white | `#1F6B2A` | `#FFFFFF` | 6.6:1 | 4.5 | ✅ |
| Warning on white | `#855700` | `#FFFFFF` | 6.2:1 | 4.5 | ✅ |
| White on the eraser (pressed) | `#FFFFFF` | `#B8352C` | 5.9:1 | 4.5 | ✅ |
| City strip label | `#FFFFFF` | `#1F6B2A` | 6.6:1 | 4.5 | ✅ |
| Focus ring on the lawn | `#2F3130` | `#82CC5C` | 6.7:1 | 3.0 | ✅ |

The yard letters' tomato and cobalt fills sit at 1.7:1 against the lawn. They're edged with a white stroke and a shadow, and every letter display has a text equivalent:
- the hero sign is `role="img"` with the message as its label;
- each builder square is labelled ("Row 2, square 5: letter A").

### Keyboard navigation

| Element | Tab | Enter/Space | Escape | Arrows |
|---|---|---|---|---|
| Skip link | 1st | Jumps to main | n/a | n/a |
| Menu (phone) | after the logo | Toggles the nav | Closes it, focus returns | n/a |
| Package cards, shape cards, size pills | one stop per group | Selects | n/a | Move within the group (native radios) |
| "See each letter" | after the price line | Shows or hides the per-letter counts | n/a | n/a |
| Builder lawn grid | one stop (roving tabindex) | Places the selected piece | n/a | Move between open squares; Delete or Backspace removes |
| Builder catalog tabs | one stop | Opens the theme | n/a | Left and Right move between themes |
| Builder tiles, eraser, undo, clear | each | Toggles or acts (`aria-pressed` on tiles and eraser) | n/a | n/a |
| 3D time and angle buttons | each | Switch (`aria-pressed`) | n/a | n/a |
| FAQ questions | each summary | Opens or closes | n/a | n/a |
| Error summary links | first after a failed step | Focus the field | n/a | n/a |

Stage changes in the builder move focus to the new stage's heading.

### Screen reader

| Element | Announced as | Notes |
|---|---|---|
| Hero sign | "Sign preview: HAPPY BIRTHDAY MAYA, image" | Updates as you type |
| Stock pill | "A: needs 4, 7 free that night" | |
| Builder grid | "Lawn grid, 16 squares across and 5 deep you can decorate, plus 2 rows by the sidewalk we keep clear, group" | |
| Builder square | "Row 2, square 5: letter A" or "…: empty" | Blocked squares aren't focusable |
| Builder action line | Polite live region: "Placed a Pumpkin. That makes it a Deluxe, $145." | Package changes ride along with the action that caused them |
| Builder notes | Polite live region: package reason, letter stock for the chosen night | |
| 3D canvas | "3D view of the decorated lawn" | Everything it shows is also in the grid and summary |

## impeccable detector

Run on `index.html`, `css/site.css`, `js/builder.js` and `js/decor.js`.

| Finding | Count | Disposition |
|---|---|---|
| `design-system-*` (colors, radii, font sizes "outside DESIGN.md") | 30+ | Expected: DESIGN.md still described the discarded marquee world. Resolved by the DESIGN.md rewrite. |
| `cramped-padding` on `.slab` / `.panel-form` | 21 | False positive: content is inset by `.wrap` gutters and the panel's own padding, not the slab |
| `dark-glow` (zero-offset text-shadow on the setback label) | 1 | Fixed: the label is now a white pill |
| `repeating-stripes-gradient` | 1 | Kept on purpose: mowing stripes, the hatched no-stake setback and the road's lane dashes carry meaning in the aerial view |
| `bounce-easing` | 1 | Kept: only the button disc's 4px hover nudge uses the overshoot |
| `cream-palette` | 1 | The committed direction (cream slabs on the lawn) |

## impeccable finish review, round 1 (redesign)

Disposition **fix**, with 8 items. The verdicts below come from round 2:

| # | Fix | Verdict |
|---|---|---|
| 1 | Rings map labels inside their rings | Done |
| 2 | The person's name is the largest type on the page | Done (MAYA caps about 95px vs about 68px headline) |
| 3 | Hero order: letters last, stock inside the form, cast behind the letters on mobile | Partly. Desktop letters fell below the first screen, so the hero was reworked (see round 2) |
| 4 | "Book" label kept on the phone nav CTA | Done |
| 5 | Booking step pills on phones | Done |
| 6 | 112px time discs with a second line; cream under the footer | Done |
| 7 | Partners as `.partner-list` | Done |
| 8 | Rewrite DESIGN.md and PRODUCT.md | Done after this round |

## impeccable finish review, round 2 (Lawn Builder plus the hero)

Disposition **fix**, with 8 Lawn Builder items, all applied:

1. **Framing:** every camera now frames the decorated patch, not the middle of the lawn.
   - Street fills 75% of the frame at a 21° pitch.
   - Up close is lower and tighter.
   - The rows of letters separate on screen.
2. **Package changes are announced:**
   - A note explains why: "6 graphics makes this a Deluxe, $145 for 48 hours. Take 4 off to stay Classic at $95."
   - The live line appends "That makes it a Deluxe, $145."
   - The price disc pops.
3. **Running total stays in view:**
   - The price, package and counts head the catalog, which is sticky on desktop and the docked tray on phones.
   - "Change the lawn's shape or size" moved to the stage head, so the bar has one action, "See it in 3D".
4. **The 3D belongs to the lawn world:**
   - Toon shading with a 3-step ramp and no tone mapping.
   - Site palette: lawn green, cream walls, ink roof, cobalt door, tomato chimney.
   - Round tree crowns.
   - The driveway is on the right, matching the aerial.
5. **2 AM lights the display, not the porch:**
   - The porch light is down to a glow.
   - The street lamp is a soft spotlight aimed at the decorations.
   - Moonlight is raised.
6. **Phone tray:**
   - All six theme tabs show, on two rows.
   - The tools are icon buttons beside the total.
   - A "fit the whole lawn on screen" overview toggle is added.
7. **One set of angle names:** Street, Up close, Driveway side, Next door and Above. These are used on the buttons and on the five thumbnails, one per angle, alternating morning and 2 AM.
8. **Labelled as an illustration:**
   - A chip on the canvas reads "Illustration. Real pieces are 18-inch coroplast."
   - "Illustration" is burned into every thumbnail.

The hero was also reworked so the yard letters reach the first screen:
- **Headline:** runs across in two lines.
- **Booking start:** shorter, with the price and Book on one row and the per-letter stock behind "See each letter", which opens itself when a letter is short.
- **Cast:** stands at the right among the letters.
- **Letters:** HAPPY BIRTHDAY MAYA is on one row.
- **Measured:** the letters sit at y=696–817 at 1440x900 and y=694–810 at 1280x800.
- **Phones:** the order is intro, form, letters.

### Verdict pass

Disposition **ship**. Every item above was confirmed done in fresh captures, with no material regressions:
- the hero, with its letters in the first screen at 1440x900 and 1280x800;
- B1 to B8 in the builder;
- the DESIGN.md and PRODUCT.md rewrite, which followed the verdict pass.

Two small notes were left for later, neither blocking:
- On the 1440 hero, MAYA's last A overlaps the cast's stars and the child's foot.
- On phones, the tray header's counts wrap onto a second line.
