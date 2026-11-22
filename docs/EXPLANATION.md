# LandConnect Monorepo — Build Explanation

## Task Overview

Set up a Turborepo monorepo for the LandConnect assessment: an Expo/React Native
mobile app, a Node.js API with PostgreSQL, shared TypeScript types, realtime
messaging, and the foundation for in-app audio/video calling. The user chose
Node.js (not FastAPI), Neon for Postgres, and free OpenStreetMap-based maps.

**Outcome:** a typechecked, runnable scaffold where auth, role-gated listings,
conversations/messages and call sessions work through REST + Socket.IO. Media
tracks for calls are deliberately the next step (they need a native dev build).

## High-Level Approach

- **Turborepo + pnpm workspaces** — one install, one typecheck, shared packages,
  incremental caching. `apps/*` for deployables, `packages/*` for code shared in
  the repo.
- **Expo + Expo Router** — file-based routing gives each assessment feature its
  own route; Expo's config plugins handle native permissions.
- **Node + Express 5 + Prisma** — Express 5 forwards async errors to one error
  handler; Prisma models the marketplace cleanly and works with Neon.
- **Socket.IO as the realtime spine** — one authenticated channel for chat,
  call lifecycle events and WebRTC signalling. LiveKit tokens are optional so
  the prototype can run with zero paid services.
- **Shared zod schemas/DTOs** — the app and API agree on shapes and validation
  from one source of truth.

Alternatives considered: NestJS (more structure, slower to scaffold),
Fastify (faster, smaller ecosystem of examples), Drizzle (lighter, but Prisma
has stronger generated types for a time-boxed build).

## Step-by-Step Process

1. Verified toolchain (Node 24, pnpm 10, git) and created the Turborepo root:
   `package.json`, `pnpm-workspace.yaml`, `turbo.json`, shared `tsconfig`.
2. Built `packages/shared` with enums, zod schemas and DTOs.
3. Generated the Expo app (`create-expo-app`, SDK 58) into `apps/mobile`,
   removed the nested git repo and demo screens, added monorepo Metro config.
4. Implemented mobile clients (`api.ts`, `auth.tsx`, `socket.ts`), theme and UI
   primitives, then all routes: auth, tabs (community, listings, messages,
   profile), listing detail/create, chat and call screen.
5. Implemented the API: env loading, Prisma client, JWT/password/role security,
   serializers, auth/listings/conversations/calls routers.
6. Added the Socket.IO layer: JWT handshake auth, private user rooms,
   membership-checked conversation rooms, typing and WebRTC relay events.
7. Wrote the Prisma schema (7 models, 5 enums), seed script and LiveKit helper.
8. Installed dependencies, generated the Prisma client, added Expo native deps,
   fixed type errors, and smoke-tested `/health` (HTTP 200).
9. Wrote this document and the README; initialized the git repository.

## File Change Summary

| File / area | Action | What changed & why |
|---|---|---|
| `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc` | Created | Workspace + task graph; hoisted deps for Expo |
| `tsconfig.base.json`, `.gitignore` | Created | Shared TS settings; ignores builds, env, skills tooling |
| `packages/shared/**` | Created | Roles/statuses/events, zod schemas, DTOs |
| `apps/mobile/**` | Created | Expo app: routes, API/auth/socket clients, theme, UI kit |
| `apps/mobile/metro.config.js` | Created | Monorepo watch folders + resolver paths |
| `apps/mobile/app.json`, `package.json`, `tsconfig.json` | Modified | Branding, bundle IDs, permission plugins, workspace deps, path mapping |
| `apps/api/prisma/schema.prisma` | Created | User, Listing, Conversation(+Participant), Message, CallSession |
| `apps/api/prisma/seed.ts` | Created | 3 demo accounts + 3 listings |
| `apps/api/src/env.ts`, `lib/*` | Created | Env, Prisma, JWT/role guards, DTO mapping, LiveKit tokens |
| `apps/api/src/routes/*` | Created | Auth, listings CRUD, conversations/messages, calls |
| `apps/api/src/realtime.ts` | Created | Socket auth, rooms, typing/WebRTC relay |
| `apps/api/src/app.ts`, `index.ts` | Created | Express wiring, HTTP + Socket.IO bootstrap |
| `README.md`, `EXPLANATION.md` | Created | Setup, feature map, architecture, interview notes |

## Detailed Changes

### Shared contracts (`packages/shared`)
`ROLES`/`LISTING_STATUSES`/`CALL_KINDS`/`CALL_STATUSES` are `as const` arrays so
both runtime validation and TypeScript unions come from one place. `SOCKET_EVENTS`
centralises event names — a typo becomes a compile error instead of a silent
no-op. Zod schemas enforce boundaries (password length, coordinate ranges,
pagination caps) and are reused on the client for form-shaped payloads.

### Authentication and roles (`apps/api/src/lib/security.ts`, `routes/auth.ts`)
Passwords are hashed with bcrypt (cost 10). Sessions use a pair:

- A **15-minute access JWT** (`typ: "access"`, `{id, email, name, role}`) so a
  leaked token has a small time window. `requireAuth` verifies it and
  `requireRole('SELLER','BROKER')` gates listing writes.
- A **30-day opaque refresh token** (48 random bytes). Only its SHA-256 hash is
  stored in `RefreshToken`, so a DB leak cannot be replayed. `POST /refresh`
  rotates both tokens; an atomic `updateMany … WHERE revokedAt IS NULL` claim
  prevents concurrent rotation, and presenting an already-rotated token revokes
  every active session for that user (reuse/theft detection). Logout revokes the
  presented token.

The mobile app stores the pair in `expo-secure-store`, retries a 401 once after
rotating, and de-duplicates concurrent refreshes in `session.ts` so a token is
never replayed. Socket.IO authenticates with the latest access token via an auth
callback on every reconnect. The JWT secret comes from env and the server warns
if the development fallback is in use.

### Listings
`GET /api/listings` filters `status = ACTIVE`, supports case-insensitive city
and keyword filters plus a price range, and paginates with a transaction that
also returns the total. `/mine` is registered before `/:id` so it isn't captured
as an id. Ownership is re-checked before PATCH/DELETE. Decimal columns are
converted with `Number()` at the serializer boundary so JSON stays numeric.

### Conversations and messages
Starting a conversation is idempotent per (listing, buyer, owner): the API looks
for an existing conversation with both participants before creating one. Every
message endpoint re-checks membership; sends update `lastMessageAt` and emit
`message:new` to the conversation room so open chats update live.

### Calling
`POST /api/calls` records the session with a unique room name, derives the
receiver from conversation membership, and emits `call:incoming` both to the
receiver's private room (works outside the chat) and the conversation room
(works inside it). The receiver answers via `/answer`; accept → ACTIVE +
`call:accepted`, reject → REJECTED + `call:rejected`, and `/end` emits
`call:ended`. If LiveKit credentials exist, the receiver gets a room token; the
initiator can fetch its token from `/api/calls/:id/token`. Without LiveKit, the
Socket.IO relay events (`webrtc:offer/answer/ice`) carry the P2P handshake.

### Mobile
`AuthProvider` restores a token from `expo-secure-store` (localStorage on web),
calls `/auth/me`, and exposes sign-in/up/out. API clients are a single
typed wrapper; socket connections reuse one instance. Screens are intentionally
thin: TanStack Query owns server state, local state only holds drafts and live
socket updates. The call screen renders ring/accept/reject/active/end states and
subscribes to the same socket events the API emits.

## How to Run / Verify

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill Neon URLs + JWT_SECRET
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm typecheck                            # all 3 packages pass
pnpm api                                  # http://localhost:4000/health → {"ok":true}
pnpm mobile                               # Expo dev server
```

Smoke test verified: `GET /health` returned HTTP 200 with the API booting on
port 4001 in a clean environment.

## Potential Interview Questions

1. **Why Turborepo?** Task graph + caching across app/API/shared; `dependsOn: ^build`
   keeps generated types in order, and filtering lets CI run only affected packages.
2. **How do roles work?** Role is stored on the user, embedded in the JWT, and
   enforced server-side with `requireRole`; the UI also hides seller-only actions,
   but that's cosmetic — the API is the source of authority.
3. **Why Socket.IO instead of raw WebSocket?** Rooms, reconnection and event
   names fit messaging and call signalling with less custom code; it also
   degrades to HTTP polling.
4. **How is the call secured?** Only conversation participants can create/answer
   a call; tokens are per-user and short-lived; phone numbers never leave the DB.
5. **Why both LiveKit and P2P?** LiveKit gives reliability and TURN-like media
   relay; the P2P path keeps the demo free if no credentials are configured.
6. **How would you scale this?** Move Socket.IO to a Redis adapter, use Neon
   pooling with Prisma, add rate limiting, and split read models for the feed.
7. **Why Prisma?** Generated types catch schema drift at compile time; migrations
   against Neon's direct URL avoid pooler limitations.
8. **Why access + refresh tokens?** Short access-token lifetimes limit the damage
   of theft, while refresh tokens enable rotation, server-side revocation and
   reuse detection. Refresh tokens are opaque and hashed at rest so a database
   leak is not directly usable.

## Assumptions & Limitations

- Media tracks are not attached yet; the call screen covers lifecycle + tokens.
- Maps use an OpenStreetMap deep link until MapLibre ships in a dev build.
- Images are URL strings; no upload pipeline yet.
- Expired refresh-token rows are not pruned on a schedule yet (a cron/job should
  delete rows past `expiresAt`).
- Native WebRTC still needs a dev build; the call UI and signaling are ready.
- The seed password is a demo credential, not a production secret.
- `code-review`/`brute-force` protections (rate limiting) are not included in
  the prototype.

## AI Tools Usage Summary

Built with Claude Code (this agent) plus the installed skill set: `expo-*`,
`react-native-*`, `nodejs-backend-patterns`, `prisma-postgres`, `neon-postgres`,
`webrtc`/`socket-io`, `impeccable`/`expo-design-system` for UI direction, and
`detailed-code-explainer` for this document. AI generated scaffolding and
first-pass implementations; all architecture choices, schema design and the
trade-offs above were reviewed and can be explained independently.
