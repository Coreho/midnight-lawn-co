# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS and JavaScript with GSAP (GreenSock) for animation, loaded from a pinned CDN build. The Lawn Builder's 3D view loads Three.js 0.160.0 on demand. There's no build step. The owner chose GSAP because the site should lean on animation. The guide's later plan is a FastAPI + Postgres booking app on the owner's VPS, and this mockup's flows are meant to carry over to it.

## Users

- **Buyers:** parents, grandparents, partners, friends and coworkers in Wayne County, Michigan, planning a surprise for someone's birthday, graduation, homecoming, retirement or sports win. Usually on a phone, often a day or two before the date.
- **Inside accomplices:** an adult who lives at the address and agrees to the surprise. They get a text before setup.
- **Recipients:** the household that wakes up to the display. They may want it removed.
- **Groups and partners:** school PTOs, boosters, youth leagues, senior class parent groups (flocking fundraisers and graduation blocks), real estate agents ("Welcome home" displays billed as client gifts), and bakeries, florists and party stores (10% referral fee or a bundle).
- **The owner-operator:** a solo crew working nights and weekends, who also uses the crew dashboard.

## Product Purpose

Midnight Lawn Co. sets up rented yard-letter greeting displays overnight (11 PM–3 AM) so they're there when the house wakes up, and takes them down the next evening (6–9 PM). The site exists to take bookings: message, night, place, a resident's consent, then payment. A booking succeeds when the right letters are free that night, a resident has agreed, and the crew arrives with a correct pick list.

## Positioning

Delight first: the morning someone wakes up to their name in the grass. The night crew is the flavor (a "we were never here" card at the door, a "mission complete" photo), and the business stays visibly legitimate throughout (hi-vis vest with the business name, job sheet on hand, plain prices and rules). Buyers can design the display themselves in the Lawn Builder and see it by morning and at 2 AM before paying. Franchise competitors look the same everywhere; this one leans into the night crew. Every display requires an inside accomplice, which is both the trespass defense and the anti-harassment control.

## Operating Context

- **Service area:** all of Wayne County. The home base is Downriver (Lincoln Park). Travel zones: Zone 1 within 10 miles $0, Zone 2 within 20 miles +$15, Zone 3 the rest of the county +$30.
- **Night routine:** park a house down with the engine and headlights off, red-light headlamp, lay the letters out and check the spelling before staking, 10–15 minutes per setup, a photo for the customer, and a take-down card at the door.
- **Winter (Nov–Mar):** pilot holes in frozen ground, two stakes per letter, weighted stands on ice or driveways, and a free snow re-set.
- **Placement:** at least 5 feet back from the sidewalk, never on the curb strip, away from meters and utility boxes. No business logo on the display itself; branding goes only on the take-down card.
- **Inventory:** two 84-piece 18-inch coroplast letter sets plus about 20 extra common letters (E, A, Y, P, R), theme graphics, 24 flamingos, and H-stakes.

## Capabilities and Constraints

- **Packages:** Classic 24 hours $95 ("HAPPY BIRTHDAY" + name, stars and balloons, 2 graphics); Deluxe 48 hours $145 (longer message, theme set, 4+ graphics, age number); Flocking 24 hours $75; fundraiser flocking $60 per flock, with the organization keeping 30–40%.
- **Add-ons:** extra day +$25; rush (under 48 hours' notice, subject to letter availability) +$20; travel zones as above. Never discount the Classic below $85.
- **Booking rules:** count the letters each message needs and subtract letters already booked for overlapping windows, warning before payment; flag likely typos ("HAPPY BRITHDAY"); require a resident accomplice's name and phone unless the buyer lives there; require landlord or HOA okay for rentals and apartments; ask about buried lines (sprinklers, landscape wire, invisible dog fence).
- **Content rules:** the business may refuse any message. No private news (unannounced pregnancies, health news), nothing insulting, no romantic messages to someone not in a relationship with the buyer, no repeat orders aimed at the same address.
- **Removal:** within 2 hours of a resident's request, no questions asked, and the buyer's identity is never revealed on the spot.
- **Refunds:** none when the buyer's consent claim was false; a partial credit otherwise; a full refund for bad timing such as a recent death or illness.
- **Lawn Builder:** buyers pick the lawn's shape and size, decorate a 2.5-ft grid from above using the catalog (Seasonal, Letters, Emojis, Icons, Messages, Clip-art), and see a labelled 3D illustration by day and night. The builder enforces the 5-ft setback and the city-strip rule, picks the package from what's placed, checks letter stock for the chosen night, and hands the message, night and package to booking.
- **Payments:** Stripe Checkout (card data never touches the server). Messages to customers go by email at launch; SMS needs A2P 10DLC registration later.
- **Repeat birthdays:** email the buyer 3 weeks before next year's date.
- **Undecided:** the final legal name (still to be checked in the LARA entity search), the phone number, email and domain (all placeholders in the mockup), and the vehicle.

## Brand Commitments

- **Name:** Midnight Lawn Co., confirmed by the owner for the mockup and pending the LARA and Facebook name checks.
- **Feel:** delight in the first five seconds; fun and trustworthy. These are the owner's answers from the 2026-10-11 redesign, which replaced the night-marquee look because it was "not fun enough" and "not trustworthy enough".
- **Look:** "Objects on a lawn" (see DESIGN.md). One daytime look, no dark mode.
- **Voice:** playful and neighborly. Night-crew touches ("Mission complete" photos, a "we were never here" take-down card) are kept, always paired with visibly legitimate practice.
- **Sports themes:** team colors and generic balls only. No team logos or wordmarks.

## Evidence on Hand

- `Surprise Lawn Decorating Business — Wayne County Startup Guide` (19 pages, Oct 9, 2026) is the source for every price, rule and policy.
- `img/`: illustrations generated for the mockup (`cast.png`, `crew.jpg`, `winter.jpg`) and the share image. The builder's catalog art is drawn SVG in `js/decor.js`.
- There are no customers, reviews, testimonials, photos of real displays or press yet. Don't fabricate any. The launch giveaway (3–5 free displays) is the planned source of the first photos and reviews.

## Product Principles

1. **Consent is the product.** Every flow makes the inside-accomplice step feel natural, not bureaucratic.
2. **Letter math up front.** Customers learn about spelling and inventory problems before they pay, never at 1 AM.
3. **Fun in the morning, legitimate at all hours.** The playful persona never undercuts trust, safety or the removal promise.
4. **See it before you pay.** The Lawn Builder and the live letter check show exactly what goes on the lawn.
5. **The photo is the ad.** Every touchpoint feeds the loop: great display, customer photo, local Facebook share, next booking.

## Accessibility & Inclusion

Buyers include grandparents and parents on phones. The site meets WCAG 2.2 AA: 16px+ body text, 44px touch targets, visible focus, reduced motion respected (GSAP animation must have a static fallback), and form errors with recovery steps.
