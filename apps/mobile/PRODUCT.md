# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Three roles share one app:

- **Buyers** browse land, evaluate a plot, and message or call the lister.
- **Sellers** publish plots they own and respond to enquiries.
- **Brokers** manage listings on behalf of owners (today functionally identical to sellers).

Primary demo situation: a buyer on a physical Android phone and a seller on an Android emulator, both on the same Wi-Fi, demonstrating discovery → chat → call. The people evaluating the app are the hiring panel and the developer running the demo.

## Product Purpose

A working prototype of a land marketplace that connects buyers, sellers and brokers. It exists to demonstrate the assignment's core flows — role-based onboarding, a community feed of land, listing management, in-app messaging, and in-app audio/video calling — without either side revealing a phone number.

Success means the core flows feel credible and effortless in a live demo: a first-time buyer understands what the app is, finds a plot, and starts a conversation in seconds; a seller can publish and manage a plot; the interface never looks like a scaffold.

## Positioning

Every contact between buyer and lister stays inside one private, persistent conversation. Listings, chat and calls share that room; no phone number is ever exposed. That privacy-plus-utility promise is the product's reason to exist, and the UI must make it felt rather than merely stated.

## Operating Context

- Expo (SDK 58) React Native dev client running on Android devices; local API and Metro bundler over LAN.
- Prototype data only: three seeded accounts (`buyer@`, `seller@`, `broker@landconnect.dev`) and a handful of Indian land listings; no real customers, press, testimonials, or benchmarks exist.
- Assessment deadline: 2026-11-25. The build must stay demo-reliable on a mid-range Android phone over Wi-Fi, including when remote imagery is slow or unavailable.
- The developer verifies everything on the Pixel 4 emulator and a physical phone; both are portrait-first.

## Capabilities and Constraints

Confirmed and in scope:

- Registration/login, three roles, role-gated listing creation and management.
- Community feed with search, listing detail, create-listing form with GPS capture.
- 1:1 chat with delivery/read receipts and unread counts.
- Audio/video call lifecycle (LiveKit media pending credentials).
- Shopping context: prices in INR, acres, city/state, coordinates.

Constraints for this pass:

- Visual and UX changes only. Preserve all working behavior, routes, API contracts and data model. No new features or schema changes.
- Buyers must not see the My Listings tab or any seller-only affordance.
- Listing imagery will use curated remote stock photography for the seeded listings; this imagery is illustrative/synthetic, not the real plots.
- Android phones only; portrait-first, small-screen safe areas, touch targets ≥ 44dp.
- The existing deep-green, WhatsApp-inspired palette is the incumbent look; this pass may replace it with a more credible marketplace identity.

## Brand Commitments

- **Green is LandConnect.** The company's logo and public presence are green; the redesign keeps green as the primary brand thread (identity mark, primary actions, active navigation), interpreted as deep forest/sage rather than WhatsApp teal.
- **Calm and credible.** Explicitly not playful or gamified, not a generic Material template, and not a flashy dark-luxury identity.
- **Category standard, full fidelity.** The chosen visual path is the conventional, photography-led property marketplace executed at the highest craft — no irony and no smuggled quirk. The stated craft bar is **Airbnb** (calm photography, whitespace, restrained chrome) plus **WhatsApp** (bubble chat, ticks, unread badges, composer familiarity).

## Evidence on Hand

- `docs/PROJECT_SPEC.md`, `README.md`, `docs/REQUIREMENTS.md`: product brief, personas, feature status.
- `apps/api/prisma/seed.ts`: demo accounts and land listings with descriptions and coordinates.
- No real property photos, agency logos, testimonials, ratings, or transaction data. None may be fabricated as claims; stock photos are illustrative only and must degrade to an intentional placeholder when they fail to load.

## Product Principles

1. **Trust is the interface.** Land is a high-value, high-anxiety purchase. Calm hierarchy, honest labels, and no hype; every screen should read as competent and safe.
2. **The plot is the hero.** Imagery, price, size and location carry the decision; chrome stays quiet around them.
3. **One tap from interest to conversation.** The path from feed to listing to chat must stay obvious and short.
4. **Show only what the role can do.** Buyers should never see seller tooling; permission boundaries are visible, not just enforced.
5. **Reliable on a demo phone.** Graceful loading, offline and image-failure states matter more than decorative motion.

## Accessibility & Inclusion

- Portrait Android phones; respect safe areas and the on-screen keyboard.
- Minimum 44dp touch targets, readable contrast at outdoor brightness, and support for system font scaling without clipped labels.
- English UI with Indian number/currency formatting (`₹`, lakh/crore-friendly grouping), since the product context is Indian land.
