# UI/UX Guidelines

**Direction:** WhatsApp-inspired, land-marketplace calm.
**Baseline:** 2026-11-21
**Source of truth:** `apps/mobile/src/lib/theme.ts`, `apps/mobile/src/components/ui.tsx`
**Related:** [SCREEN_FLOW.md](SCREEN_FLOW.md) · [PROJECT_SPEC.md](PROJECT_SPEC.md)

---

## 1. Design principles

1. **Familiar first.** Borrow WhatsApp's structure — green header, chat list, bubbles,
   composer, call glyphs — so users need no onboarding.
2. **One primary action per screen.** Sign in, Publish listing, Send, Accept. Everything else is
   secondary or hidden.
3. **Contact stays in-app.** Never show a phone number, `tel:` link or external contact action.
4. **Land is visual.** Cover image first, then title, price, size, place. Money is prominent.
5. **Honest states.** Ringing, connected, ended, empty, loading and error are explicit; no silent
   failures.
6. **Thumb-first.** Primary actions within reach; 44+ pt targets; keyboard-aware forms.
7. **Consistent, not decorative.** No gradients/animations that do not communicate state.

## 2. Design tokens

### 2.1 Color

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#075E54` | Headers, brand surfaces, primary text on light |
| `primaryDark` | `#054D44` | Call screen background, logo text |
| `teal` | `#128C7E` | Links, active tab tint, secondary accents |
| `accent` | `#25D366` | Primary buttons, send button, accept call |
| `accentDark` | `#1EBE5A` | (reserved for pressed accent) |
| `background` | `#ECE5DD` | App/chat background |
| `surface` | `#FFFFFF` | Cards, inputs, sheets |
| `surfaceAlt` | `#F7F8FA` | Composer bar, subtle zones |
| `bubbleIn` | `#FFFFFF` | Incoming chat bubble |
| `bubbleOut` | `#DCF8C6` | Outgoing chat bubble, badges, placeholders |
| `text` | `#111B21` | Primary text |
| `textMuted` | `#667781` | Secondary text, placeholders |
| `border` | `#E4E9EB` | Hairlines, input borders |
| `danger` | `#D93025` | Reject/end call, destructive text |
| `warning` | `#F4B400` | Non-ACTIVE listing status |
| `white` | `#FFFFFF` | On-primary text |
| `overlay` | `rgba(0,0,0,0.45)` | Scrims (reserved) |

Contrast notes: white on `primary`/`danger` passes AA for large text; `textMuted` on white is
borderline for small text — use 13 px+ or darken to `#5B6B75` for body copy.

### 2.2 Spacing

`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`

Use `lg` for screen padding, `md` for gaps inside rows, `xl` for hero/auth padding.

### 2.3 Radius

`sm 8 · md 12 · lg 16 · xl 24 · pill 999`

Cards `lg`, inputs `md`, buttons/composer `pill`, chat bubbles `md` (WhatsApp uses a small tail
radius; a uniform 12 is the prototype simplification).

### 2.4 Shadow

One card shadow: black 2 px y-offset, 8% opacity, 6 px blur, elevation 3. Do not stack shadows.

### 2.5 Type scale (as used)

| Role | Size / weight |
|---|---|
| Screen hero title | 28–32 / 800 |
| Section title | 16 / 700 |
| Card title | 16 / 700 |
| Price | 18–24 / 800 |
| Body | 14–15 / 400, line-height 20–22 |
| Meta | 12–13 / 400–600 |
| Button | 16 / 700 |
| Badge | 12 / 700 |

System font stack (no custom font shipped). Keep body line-height ≥ 1.4.

## 3. Components

### Button
- Variants: `primary` (accent fill, white text), `secondary` (white fill, primary border/text),
  `ghost` (transparent), `danger` (red fill).
- Pill radius, vertical padding 13, horizontal 24.
- Loading shows "Please wait…" and disables; pressed/disabled opacity 0.75.
- Accessibility: `role="button"`, `state={disabled, busy}`.

### Field
- Label above input, 13 / 600 muted.
- Input: white, 1 px border, radius 12, padding 12/16, 16 px text.
- Multiline: min height 110, top aligned.
- Placeholder uses `textMuted`.

### Card
- White, radius 16, padding 16, card shadow, 8 gap.
- Used for listing detail sections, profile sections.

### Avatar
- Image if URL, otherwise initials on teal.
- Default 44; profile 84.
- Initials: first letters of first two words, uppercase.

### Badge
- Light green pill (`bubbleOut`), primary text, 12/700.
- Used for role and non-ACTIVE status.

### EmptyState / Loading
- Centered, 32 padding, 18/700 title, 14 muted body.
- Loading is text-only ("Loading…") — acceptable for a prototype; skeletons are future work.

### ListingCard
- Cover image 170 h; fallback 120 h with first letter on light green.
- Title (2 lines), price (18/800 primary), `"{acres} acres · {city}, {state}"`.
- Non-ACTIVE status in uppercase warning color.
- Whole card pressable with accessibility label "title, price".

### MapPreview (current)
- White bordered card: pin tile, address label, coordinates, "Open in OpenStreetMap →".
- Opens `openstreetmap.org` with `mlat/mlon` at zoom 16.
- Target: replace with embedded MapLibre map (see [MAPS_AND_GEOLOCATION.md](MAPS_AND_GEOLOCATION.md)).

### Chat
- Incoming bubble white, outgoing `bubbleOut`, max width 82%, radius 12.
- Composer: rounded input, circular accent send button (44), disabled at 50% when empty.
- Header has audio/video glyph actions.

### Call controls
- Full-screen deep green.
- 120 px avatar circle; kind + status text.
- Ringing receiver: red reject (`✕`) and green accept (`✓`), 72 px circles.
- Active: mute (`🎙️`/`🔇`) and camera (`🎥`/`📷`) toggles, 56 px; red end (`⏹`), 72 px.
- Error text in a light red (`#FFB4AB`) for dark background.

## 4. Screen patterns

| Screen | Pattern |
|---|---|
| Login | Brand hero, white form card on green, single primary CTA |
| Register | Role chips (radio), white form card, optional phone labelled private |
| Community feed | Green search bar, stacked listing cards, pull-to-refresh |
| My Listings | Snackbar-style header CTA, cards + destructive text action |
| Messages | WhatsApp-style rows: avatar, name, "Re: listing · last message" |
| Chat | Bubbles on beige, composer pinned, call actions in header |
| Listing detail | Cover, title/price/meta, About card, map card, owner card, sticky-feel actions |
| Create listing | Grouped fields, location box, hint text, one publish CTA |
| Profile | Centered identity, role badge, capability card, privacy card, sign out |
| Call | Immersive dark, status-first, large circular controls |

## 5. Interaction and state rules

- **Pressed:** opacity 0.75–0.9, never color inversion.
- **Disabled:** opacity 0.5 (composer) or button disabled style.
- **Loading:** label changes and control disables; no duplicate submits.
- **Errors:** inline, near the action, red 13–14 px; never an alert-only failure.
- **Empty:** explain what to do next, not just "No data".
- **Keyboard:** `KeyboardAvoidingView` on auth/create/chat; `keyboardShouldPersistTaps`.
- **Pull-to-refresh:** feed and conversation list.
- **Auto-scroll:** chat scrolls to end on content size change.
- **Optimistic UI:** not used yet; message send appends after the server confirms.

## 6. Accessibility

Implemented:
- `accessibilityRole` on buttons, links, radio chips, listing cards and map card.
- `accessibilityState` for selected role and busy/disabled buttons.
- `accessibilityLabel` on call controls and listing cards.
- Minimum 44 pt send button and 56–72 pt call controls.

Gaps to close:
- Tab bar uses emoji glyphs; add proper labels/hints if testing with screen readers.
- Avatar images have a label only when a URL exists; initials view lacks one.
- Color contrast of muted meta text on beige needs a check.
- No dynamic-type-specific layout verification yet.
- Call screen state changes should be announced (`accessibilityLiveRegion`).

## 7. Content and tone

- Short, concrete, action-led.
- Use "land", "plot", "listing", not "property asset".
- Money in INR with Indian grouping (`₹85,00,000`) via `Intl.NumberFormat('en-IN')`.
- Privacy copy: "Contact stays inside the app", "No numbers are exchanged".
- Errors say what to do: "Enter a valid email", "Location permission was denied — enter
  coordinates manually."
- Avoid blame and jargon.

## 8. Do / don't

| Do | Don't |
|---|---|
| Keep the green header and beige chat canvas | Introduce a second brand palette |
| Show price and acreage together | Hide price behind a tap |
| Use one accent-filled CTA per screen | Compete with multiple green buttons |
| Label optional/private fields | Ask for phone as if mandatory |
| Explain empty and error states | Leave blank screens |
| Use WhatsApp-like glyphs for chat/call | Invent unfamiliar iconography for core actions |

## 9. Brand assets

- Logo mark: "LC" on an accent circle, primary-dark text.
- Splash background `#075E54`.
- App name `LandConnect`; Android package `com.landconnect.app`; scheme `landconnect`.
- Optional Figma: not required by the brief; the tokens above are the design source of truth.

## 10. UI gaps to resolve before demo

1. Incoming-call screen outside chat (P0).
2. Real video surface and remote audio indicator (P0).
3. Embedded map with marker (P1).
4. Image upload with thumbnails (P1).
5. Listing edit screen (P1).
6. Skeleton loading instead of text (P2).
7. Empty/edge states for permission denial (P1).
