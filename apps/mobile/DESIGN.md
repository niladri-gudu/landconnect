# LandConnect — mobile design system

Supersedes nothing (first design record). Linked from `PRODUCT.md` and the design surface brief.
Produced for the user's instruction: *"design the
ui and ux properly and make it look good … make the ui and ux like a proper good app"*.

## Direction

A calm, credible land marketplace. Photography and land facts lead; chrome stays quiet. The palette
comes from the landconnect.si landing page: near-black forest ink (`#10201C`), deep green
(`#0F6E56`), mint (`#5DCAA5`), pale mint ground (`#E8F1ED`) and one amber accent (`#EF9F27`). The
craft bar is **Airbnb** (whitespace, photography, restrained controls) plus **WhatsApp** (bubble
chat, ticks, unread badges, composer familiarity). No playful/gamified devices, no generic Material
template, no dark-luxury styling.

Android portrait only. Light theme only (`userInterfaceStyle: light`); dark theme is a deliberate
follow-up, not a half-finished state.

## Color

| Token | Value | Use |
|---|---|---|
| `primary` | `#0F6E56` | brand, primary buttons, active nav, outgoing accents |
| `primaryDark` | `#10201C` | auth hero, call stage, profile hero, splash |
| `primarySoft` | `#E8F1ED` | tonal buttons, icons, selected role cards |
| `mint` / `teal` | `#5DCAA5` | highlights and the logo's light wedge |
| `accent` / `amber` | `#EF9F27` | single accent, logo sun, price emphasis |
| `background` | `#F5F8F7` | app ground |
| `surface` | `#FFFFFF` | cards, bars, sheets |
| `surfaceAlt` | `#E8F1ED` | input fills, pressed rows |
| `text` | `#10201C` | primary text |
| `textMuted` | `#4B5C55` | secondary text |
| `textFaint` | `#9CA3AF` | placeholders, timestamps |
| `border` | `#E5E7EB` | hairlines |
| `danger` | `#B3261E` | destructive actions and errors |
| `bubbleOut` | `#D7F0E6` | outgoing chat bubbles |
| `chatBackground` | `#F1F7F4` | chat ground |
| `tickRead` | `#0F6E56` | read receipts |

Photography is the only saturated colour on a feed card. Cards use a hairline border, never border
plus a wide shadow.

## Logo and icon

The mark is the landconnect.si glyph: a `#10201C` rounded tile with two land wedges
(`#0F6E56` left, `#5DCAA5` right) and an `#EF9F27` sun at the horizon, with an `#10201C` centre dot.
It is rendered from the original 48-unit SVG at high density, never upscaled from a screenshot:

| Asset | Source | Use |
|---|---|---|
| `assets/images/icon.png` | full glyph, 1024 | Android legacy icon, web |
| `assets/images/android-icon-foreground.png` | glyph at 66% safe zone | adaptive foreground |
| `assets/images/android-icon-background.png` | solid `#10201C` | adaptive background |
| `assets/images/android-icon-monochrome.png` | white silhouette | themed icons |
| `assets/images/splash-icon.png` | mark without tile | splash on `#10201C`, 200dp |
| `assets/images/brand-mark.png` | full glyph, 288 | auth hero |

The login screen shows the mark above the LandConnect wordmark; the register screen repeats it above
the form heading.

## Typography

One family (Android system sans). Hierarchy comes from size and weight:
`display` 30/36 · `h1` 26/32 · `h2` 21/28 · `title` 17/24 · `body` 15/23 · `caption` 13/18 ·
`label` 12/16 · `micro` 11/14. Display tracking stops at -0.7px; no eyebrow-above-heading pattern.

## Spacing and shape

4-based scale: 4, 8, 12, 16, 20, 24, 32, 40. Screen gutter 20. Cards 16 radius; inputs 12; sheets 24;
pills for small controls only. Minimum touch target 44dp (48dp where layout allows).

## Components

- `Button` — primary / secondary / tonal / ghost / danger; 52dp tall; icon optional; native ripple.
- `IconButton` — 44dp circular; tonal / outline / plain / dark.
- `Field` — label, optional icon, hint, error, password reveal; focused border `primary`; error border
  `danger`.
- `Card` — white, sage hairline, 16 radius; never nested.
- `Avatar` — initials fallback from a green palette; optional white ring.
- `Badge` — green / neutral / warning / danger / outline, uppercase micro text.
- `EmptyState`, `ErrorState`, `Loading` — every data surface ships all three.
- `SkeletonBlock`, `ListingCardSkeleton` — pulsing placeholders, not centred spinners.
- `ListingImage` — expo-image with disk cache and an intentional parcel-mark fallback.
- `ListingCard` — 16:10 photography, price, title, location, lister identity; first feed card gets
  the featured scale.
- `ListingMap` — embedded MapLibre map (free OpenFreeMap tiles) with a house pin and an
  OpenStreetMap escape link; `LocationPicker` is the same map made tappable in the create form.
  When the native module is absent the schematic `MapPreview` card renders instead.
- `SectionHeader`, `Divider`.

## Screen rules

- **Tabs** — Material bottom bar; Explore, Messages, Profile for buyers; Listings additionally for
  sellers/brokers. `href: null` hides the destination, and the screen redirects buyers.
- **Explore** — brand app bar, "Find your ground" heading, pill search, featured first card, live
  count, pull-to-refresh, skeletons and search-empty state.
- **Listing detail** — edge-to-edge photo carousel, back circle, ivory sheet, price, stat strip
  (area / per-acre / listed), lister card, about, map, sticky Message seller + call bar for buyers.
- **Messages** — avatar rows, last-message preview, relative time, unread badge; live updates via the
  user room.
- **Chat** — custom header with lister identity and role, day separators, white incoming / sage
  outgoing bubbles, Ionicons ticks (grey delivered, blue read), retry-on-failure, keyboard-safe
  composer.
- **My Listings** — seller/broker only; status badge, explicit Remove with confirmation.
- **Create listing** — grouped sections (basics, price/size, location, photos), GPS capture, image
  previews, inline validation.
- **Auth** — deep-green hero, white card, role cards with descriptions; password reveal.
- **Calls** — deep-green stage with the participant's real name, role and avatar (from the call
  payload, not a placeholder); tapping a call button immediately paints a full-screen setup stage
  (name, role, avatar, cancel) while the permission prompt and call creation run, then the route is
  seeded from the created call so it renders “Calling…” without a second spinner; ending or declining
  a call leaves the screen immediately while the server records the result and notifies the other
  side; live call controls use real LiveKit track state; microphone/camera permission is requested
  before joining and denial offers Settings/retry; app-level incoming-call modal with labels, not
  glyph-only buttons.

## Imagery and truth

Seeded listings use curated Unsplash photography, recorded in `apps/api/prisma/seed.ts`; it is
illustrative, not the real plots. Sellers pick up to four photos in the create form; the app
uploads them to Neon Object Storage and stores the returned public URLs. Missing/broken images
fall back to the parcel-mark placeholder.
No ratings, verification badges, response times or testimonials are shown because none exist.

## Accessibility

Safe areas and IME insets respected; 44dp+ targets; readable contrast on ivory and dark green;
accessibility labels on icon-only controls; system font scaling tolerated by flexible layouts;
Indian INR formatting and lakh/crore units.

## Verification

Screenshots live in `docs/screenshots/` (feed, detail, chat, messages, profile, listings, create,
login, incoming call, map detail, map picker, upload proof, call setup and ringing, message
banner, call history, video call on both devices, plus audio-call evidence from a Nothing Phone
3a and the emulator). `pnpm --filter @landconnect/mobile typecheck` passes. The
Expo dev-client "Tools" floating button is development-only and does not ship in a production
build.
