# Technology Stack

**Baseline:** 2026-11-21. Versions are the ranges declared in the workspace `package.json`
files; the lockfile is authoritative.

---

## 1. Summary

| Layer | Technology | Version (declared) | Why |
|---|---|---|---|
| Monorepo | Turborepo | ^2.5 | One install, shared cache, ordered typecheck/build |
| Package manager | pnpm | 10.11.1 (pinned) | Strict node_modules, workspace linking |
| Language | TypeScript | ^5.7 / ~6.0 (mobile) | End-to-end type safety |
| Mobile runtime | Expo SDK | ~58.0 | Managed native config, EAS builds, OTA-ready |
| Mobile framework | React Native | 0.88.1 | Native performance, one codebase |
| UI runtime | React | 19.3.0 | Current RN pairing |
| Routing | Expo Router | ~58.0 | File-based routes, typed routes, deep links |
| Server data | TanStack Query | ^5.66 | Caching, retries, invalidation |
| API server | Node.js | ≥20 (dev: 24) | Same language as app, fast iteration |
| HTTP framework | Express | ^5.1 | Async error propagation, familiar middleware |
| ORM | Prisma | ^6.3 | Generated types, migrations, Neon compatibility |
| Database | PostgreSQL (Neon) | managed | Relational fit, free tier, branching |
| Validation | Zod | ^3.24 | Shared request schemas + client pre-validation |
| Realtime | Socket.IO | ^4.8 | Rooms, reconnection, auth handshake |
| Calling (tokens) | LiveKit server SDK | ^2.9 | Managed SFU/TURN, per-user room tokens |
| Calling (client) | LiveKit RN SDK *(planned)* | TBD | Native WebRTC transport, Expo config plugin |
| Auth | bcryptjs + jsonwebtoken | ^3.0 / ^9.0 | Password hashing, signed access tokens |
| Security middleware | helmet, cors | ^8.0 / ^2.8 | Headers and origin policy |
| Location | expo-location | ~58.0 | Foreground GPS + permissions |
| Image picking | expo-image-picker | ~58.0 | Installed for the upload step (not wired yet) |
| Secure storage | expo-secure-store | ~58.0 | Keychain/Keystore token storage |
| Maps | MapLibre RN + OpenFreeMap *(planned)* | TBD | Free, no API key; native vector map |
| Builds | EAS Build | CLI ≥27 | Cloud APK/IPA without local Android toolchains |
| Dev runtime | tsx | ^4.19 | TS execution + watch for the API |

## 2. Major decisions and rationale

### 2.1 Expo + React Native instead of bare React Native
**Decision:** Expo SDK 58 with Expo Router.
**Why:** The brief asks for a mobile prototype in days, not a native infrastructure project.
Expo handles build config, permissions plugins, secure storage, location and OTA-style
iteration. Expo Router gives each assessment feature a file, which makes the code map directly
to the requirement list.
**Trade-off:** Native modules (WebRTC, MapLibre) require a development/preview build, not Expo
Go. This is accepted and planned; EAS builds are already configured.

### 2.2 Node.js + Express instead of FastAPI
**Decision:** Node.js + TypeScript.
**Why:** One language across app, API and shared contracts. Zod schemas and DTOs are imported
unchanged by both sides, eliminating a class of contract drift. Express 5 automatically
forwards rejected promises to the error handler, so route modules stay thin.
**Alternatives:** FastAPI (brief allows it) would give excellent validation ergonomics but
would duplicate every contract in Python. NestJS adds structure this prototype does not need.

### 2.3 PostgreSQL + Prisma on Neon
**Decision:** PostgreSQL, Prisma ORM, Neon hosting.
**Why:** The domain is relational (users own listings; conversations have participants;
messages/calls reference users and conversations). Prisma generates precise types and the
schema doubles as documentation. Neon offers a free, serverless Postgres with pooled and direct
connection strings, matching the API's runtime and migrations respectively.
**Trade-off:** Serverless Postgres can cold-start. For a demo this is acceptable; the API can
also be kept warm before the evaluator opens the app.

### 2.4 Socket.IO for messaging and signalling
**Decision:** One authenticated Socket.IO namespace for chat, typing, call lifecycle and WebRTC
signalling relay.
**Why:** Rooms map naturally to conversations and per-user call routing. Reconnection and
heartbeats come for free. The same channel can carry SDP/ICE messages without a second server.
**Trade-off:** Requires sticky sessions / a Redis adapter if horizontally scaled. Documented as
future work.

### 2.5 LiveKit with a P2P fallback
**Decision:** Issue LiveKit room tokens when `LIVEKIT_*` env vars are present; keep Socket.IO
`webrtc:offer|answer|ice` relay events for a credential-free peer-to-peer path.
**Why:** The key evaluation criterion is working calls. LiveKit provides an SFU and TURN-like
relay, which makes calls reliable across NATs; the P2P path keeps the prototype runnable with
zero paid services. The server owns authorization either way: only call participants can
request a token.
**Trade-off:** Two paths mean the client must choose one consistently. The plan is to ship the
LiveKit path for the demo and retain the relay as a documented fallback.

### 2.6 Access JWT + rotating refresh token
**Decision:** 15-minute signed access token plus a 30-day opaque refresh token hashed at rest.
**Why:** Short-lived access tokens limit theft impact. Hashing refresh tokens means a database
leak cannot be replayed. Rotation with atomic claim supports reuse detection: presenting an
old token revokes the session family.
**Trade-off:** More moving parts than a single long-lived JWT; justified by the security story
and easy to explain in interview.

### 2.7 Zod contracts in a shared package
**Decision:** `packages/shared` exports enums, event names, Zod schemas and DTO interfaces.
**Why:** Event-name typos become compile errors. API and client validate with the same rules.
The create-listing screen validates locally before the request, so users see field-specific
errors without a round trip.

### 2.8 WhatsApp-inspired design token system
**Decision:** Deep green header, beige chat background, white incoming bubbles, light-green
outgoing bubbles; a small token file (`lib/theme.ts`) instead of a UI library.
**Why:** The brief asks for a WhatsApp-inspired UI. A local token file keeps the bundle small
and makes the direction explicit. Reusable primitives (`Button`, `Field`, `Card`, `Avatar`,
`Badge`, `EmptyState`) keep screens consistent.

## 3. Development tooling

| Tool | Purpose |
|---|---|
| Turborepo | Task graph, caching, `dependsOn: ^build/^typecheck` |
| tsx | Run TypeScript API directly with watch |
| Prisma CLI | Generate client, push/migrate schema, seed, Studio |
| EAS CLI | Build dev client and preview APK |
| Expo CLI | Metro dev server, device preview |
| Git + Conventional Commits | History and reviewability |

## 4. Free-tier / zero-cost posture

The prototype is designed to run with:

- Neon free Postgres.
- LiveKit Cloud free tier **or** a local Docker LiveKit server for the demo.
- EAS free build credits.
- OpenFreeMap/OSM tiles (no key).
- A local or free-tier Node host (Render/Fly/Railway) for the hosted API.

No component requires a credit card purely to demonstrate the core flow.

## 5. Deliberately not used

| Option | Why not |
|---|---|
| Supabase | User preference; Neon + Prisma chosen instead |
| Google Maps SDK | Paid key requirement; MapLibre/OSM is free |
| Leaflet | Web-only; MapLibre RN is the native equivalent |
| Redux/Zustand | TanStack Query + local state is enough for this scope |
| GraphQL | REST is simpler to document and demo here |
| WebSockets from scratch | Socket.IO's rooms/reconnect reduce code and risk |
| SQLite | Production parity and relational features favor Postgres |

## 6. Version-sensitive risks

- **Expo SDK 58 / RN 0.88** is recent; verify LiveKit RN SDK and MapLibre peer dependencies
  against it before committing to a build. Build a development client early to fail fast.
- **React Compiler + typed routes** are enabled as experiments; revert if they cause build
  instability under deadline pressure.
- **Prisma 6** requires `prisma generate` before typechecking; the Turborepo task graph handles
  this when running through `pnpm`.
