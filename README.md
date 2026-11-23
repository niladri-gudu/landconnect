# LandConnect — Land Marketplace Mobile App (Prototype)

A WhatsApp-inspired land marketplace where **buyers**, **sellers** and **brokers** discover
plots, chat privately, and start audio/video calls **without exchanging phone numbers**.

Built as the LandConnect technical assignment (issued 2026-11-20, due **2026-11-25 23:59 IST**).

> **Status as of 2026-11-23:** auth, role-gated listings, conversations, realtime messaging,
> call signalling, LiveKit media wiring and the global incoming-call overlay are implemented.
> An embedded **MapLibre + OpenFreeMap** map (no API key) is verified on the Android dev build,
> and listing photos upload through **Neon Object Storage** (`POST /api/uploads`). LiveKit
> **audio media is verified between a physical phone and the emulator** (ICE/DTLS connected,
> audio RTP both ways over cellular); the video-call check, preview APK and demo video are still
> pending. See [TASK_TRACKER.md](docs/TASK_TRACKER.md).

---

## Documentation index

All specification documents live in [`docs/`](docs/). `README.md` stays at the root because it is the entry point.

| Document | What it covers |
|---|---|
| [PROJECT_SPEC.md](docs/PROJECT_SPEC.md) | Product brief, personas, goals, scope, success criteria |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Requirement IDs, acceptance criteria, implementation status |
| [TECH_STACK.md](docs/TECH_STACK.md) | Every library/service chosen, versions, rationale |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, deployment topology |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Prisma models, ERD, constraints, indexes |
| [API_SPEC.md](docs/API_SPEC.md) | All REST endpoints with payloads and errors |
| [AUTH_AND_ROLE_PERMISSIONS.md](docs/AUTH_AND_ROLE_PERMISSIONS.md) | Token design, role matrix, enforcement |
| [UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) | WhatsApp-inspired design system and components |
| [SCREEN_FLOW.md](docs/SCREEN_FLOW.md) | Route map and end-to-end user journeys |
| [AUDIO_VIDEO_CALLING.md](docs/AUDIO_VIDEO_CALLING.md) | **Key requirement** — call lifecycle, media plan |
| [REALTIME_MESSAGING.md](docs/REALTIME_MESSAGING.md) | Socket.IO rooms, events, delivery semantics |
| [MAPS_AND_GEOLOCATION.md](docs/MAPS_AND_GEOLOCATION.md) | Current location handling and MapLibre plan |
| [PROPERTY_LISTINGS.md](docs/PROPERTY_LISTINGS.md) | Listing domain rules, lifecycle, validation |
| [SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Threat model, controls, privacy decisions |
| [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | 4-day plan to the deadline, priorities, risks |
| [TASK_TRACKER.md](docs/TASK_TRACKER.md) | Live checklist with owners and status |
| [CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md) | TypeScript, naming, imports, git workflow |
| [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | API + mobile + EAS configuration |
| [TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Test pyramid, call test matrix, CI |
| [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Honest gap list with severity and fix plan |
| [AI_DEVELOPMENT_RULES.md](docs/AI_DEVELOPMENT_RULES.md) | Permitted AI use and disclosure rules |
| [DEMO_AND_SUBMISSION.md](docs/DEMO_AND_SUBMISSION.md) | Deliverables, video script, submission email |
| [EXPLANATION.md](docs/EXPLANATION.md) | Narrative build explanation / interview prep |

---

## Feature status

Legend: ✅ done · 🟡 partial · ⬜ not started

| Brief requirement | Status | Where |
|---|---|---|
| Registration + secure login | ✅ | `apps/api/src/routes/auth.ts`, `(auth)/login.tsx`, `(auth)/register.tsx` |
| Roles: Buyer / Seller / Broker | ✅ | Prisma `Role`, `requireRole()`, register role chips |
| Role-based access + permissions | ✅ | API guards; UI hides seller actions |
| Community listing feed | ✅ | `(tabs)/index.tsx`, `GET /api/listings` |
| Listing create + manage | 🟡 create/delete UI, API supports edit; no edit screen | `(tabs)/listings.tsx`, `listing/create.tsx` |
| Image upload | ✅ photo picker → Neon Object Storage (4 images, ≤8 MB) | `listing/create.tsx`, `POST /api/uploads` |
| Maps + geotagging | 🟡 embedded MapLibre + OpenFreeMap, tap-to-place picker; verify on native build | `listing-map.tsx`, location section in `listing/create.tsx` |
| In-app messaging | ✅ | `(tabs)/messages.tsx`, `chat/[conversationId].tsx` |
| Meeting rooms | 🟡 conversations act as persistent rooms | Socket.IO conversation rooms |
| **In-app audio/video calling** | 🟡 LiveKit RN media + track-backed controls; **device build + `LIVEKIT_*` pending** | `call/[callId].tsx`, `components/active-call.tsx`, `/api/calls` |
| Accept / reject / end calls | ✅ | `/api/calls/:id/answer`, `/api/calls/:id/end` |
| Incoming call while outside chat | ✅ | `components/incoming-call.tsx` app-level ring overlay |
| No phone number exchange | ✅ | owner/conversation/call DTOs never include phone |
| Demo build + video | ⬜ | `DEMO_AND_SUBMISSION.md` |

---

## Stack

| Layer | Choice |
|---|---|
| Mobile | Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · Expo Router |
| Data/state | TanStack Query · React context + hooks |
| API | Node.js 24 · Express 5 · TypeScript (tsx) · Zod |
| Auth | bcrypt · short-lived JWT access tokens · rotating hashed refresh tokens |
| Realtime | Socket.IO (chat, typing, call lifecycle, WebRTC signalling relay) |
| Database | PostgreSQL on **Neon** · Prisma ORM |
| Calling | LiveKit server SDK for room tokens; Socket.IO P2P relay fallback |
| Storage | Neon Object Storage (S3-compatible, `public_read` bucket) · Files SDK |
| Maps | MapLibre RN + free OpenFreeMap vector tiles (no API key); OSM link fallback |
| Builds | EAS Build (preview APK / dev client) |
| Monorepo | Turborepo · pnpm workspaces |

Full rationale in [TECH_STACK.md](docs/TECH_STACK.md).

---

## Repository layout

```
apps/
  api/                 Express + Prisma + Socket.IO server
    prisma/            schema.prisma, seed.ts
    src/               env, lib, routes, realtime, app, index
  mobile/              Expo app (src/app routes, src/lib clients, components)
packages/
  shared/              Zod schemas, enums, DTOs shared by app + API
```

---

## Quick start

Prerequisites: **Node 20+**, **pnpm 10**. Expo Go runs the UI-only flows; **calling requires a
development build** because it loads native WebRTC.

1. **Create a Neon Postgres database** and copy both connection strings
   (pooled `-pooler` host for the API, direct host for migrations).
2. **Configure the API:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # fill DATABASE_URL, DIRECT_URL, JWT_SECRET
   ```
   Photo uploads also need Neon Object Storage credentials. With the Neon CLI linked
   (`neon deploy && neon env pull`), copy the `AWS_*` values into `apps/api/.env`.
   See [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md).
3. **Install and prepare the database:**
   ```bash
   pnpm install
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```
4. **Run the API** (default `http://localhost:4000`):
   ```bash
   pnpm api
   ```
5. **Run the app** in a second terminal:
   ```bash
   pnpm mobile
   ```
   Or both through Turborepo: `pnpm dev`.

### Pointing the app at the API

The app reads `EXPO_PUBLIC_API_URL` (default `http://localhost:4000`).

- Android emulator: `http://10.0.2.2:4000`
- Physical device: your machine's LAN IP, e.g. `http://192.168.1.20:4000`

```bash
EXPO_PUBLIC_API_URL="http://192.168.1.20:4000" pnpm mobile
```

All variables: [ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md).

### Demo accounts

Seed script creates (password `password123` for all):

| Role | Email |
|---|---|
| Buyer | buyer@landconnect.dev |
| Seller | seller@landconnect.dev |
| Broker | broker@landconnect.dev |

---

## Auth in one paragraph

15-minute access JWT plus a 30-day opaque refresh token whose SHA-256 hash is stored.
`POST /api/auth/refresh` rotates both atomically; presenting an already-rotated token revokes
every session for that user (theft detection). The app keeps tokens in `expo-secure-store`
(localStorage on web), refreshes once on a 401, and de-duplicates concurrent refreshes.
Details: [AUTH_AND_ROLE_PERMISSIONS.md](docs/AUTH_AND_ROLE_PERMISSIONS.md).

## Calling in one paragraph

`POST /api/calls` creates a `CallSession` (RINGING) with a unique room name and emits
`call:incoming` to the receiver's private `user:<id>` room and the conversation room. The
receiver accepts/rejects via `POST /api/calls/:id/answer`; acceptance flips to ACTIVE and
returns a LiveKit room token when `LIVEKIT_*` is configured. Every call payload embeds both
participants, so the app-level `IncomingCallHost` and call stage show the real name and role
before any second fetch. Microphone (and camera for video) permission is requested before a
call is created, accepted, or joined; denial shows Settings/retry actions instead of a silently
muted room. An unanswered outgoing call ends itself after 45 seconds. Once ACTIVE, both sides
join with `LiveKitRoom`; the mic (and camera for video) publish automatically, remote video
renders through `VideoTrack`, and mute/camera control the real tracks. `POST /api/calls/:id/end`
closes the session. Requires a development build — Expo Go cannot load native WebRTC. See
[AUDIO_VIDEO_CALLING.md](docs/AUDIO_VIDEO_CALLING.md).

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | API + app via Turborepo |
| `pnpm api` | API with tsx watch (port 4000) |
| `pnpm mobile` | Expo dev server |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema (prototype) |
| `pnpm db:migrate` | Create a migration |
| `pnpm db:seed` | Demo users + listings |
| `pnpm db:studio` | Prisma Studio |

---

## Before submission

The authoritative checklist lives in [TASK_TRACKER.md](docs/TASK_TRACKER.md). Top items:

- [x] Attach real audio/video media in code (LiveKit RN — verify on a development build)
- [x] Global incoming-call listener + ring screen
- [x] Camera/microphone permissions in app config (dev build still required)
- [x] Embedded MapLibre map with location picker (verified on the Android dev build)
- [x] Image upload via photo picker + Neon Object Storage
- [ ] Deploy API and produce a preview APK
- [ ] Record the demo video (calling flow first)
- [ ] Finalise docs and AI usage summary, push the repository

Submission mechanics: [DEMO_AND_SUBMISSION.md](docs/DEMO_AND_SUBMISSION.md).
