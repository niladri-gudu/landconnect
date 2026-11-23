# Architecture

**Baseline:** 2026-11-21
**Related:** [TECH_STACK.md](TECH_STACK.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [API_SPEC.md](API_SPEC.md) · [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md)

---

## 1. System context

```
┌──────────────────────┐            HTTPS / WSS             ┌──────────────────────────┐
│  Expo mobile app     │  ───────────────────────────────▶ │  Node.js API (Express 5) │
│  React Native + TS   │  ◀───────────────────────────────  │  REST + Socket.IO        │
│                      │                                    │                          │
│  • Expo Router       │                                    │  • JWT auth + roles      │
│  • TanStack Query    │                                    │  • Zod validation        │
│  • SecureStore       │                                    │  • Prisma ORM            │
│  • socket.io-client  │                                    └───────────┬──────────────┘
└───────┬──────────────┘                                                │
        │                                                               │ TCP/SQL
        │ native WebRTC (planned)                                       ▼
        │                                                   ┌──────────────────────────┐
        │                                                   │ PostgreSQL (Neon)        │
        │                                                   │ users, listings, chats,  │
        │                                                   │ messages, calls          │
        │                                                   └──────────────────────────┘
        │
        │  room media (planned)
        ▼
┌──────────────────────┐          room tokens (REST)        ┌──────────────────────────┐
│  LiveKit SFU / TURN  │ ◀───────────────────────────────── │  API (livekit-server-sdk)│
└──────────────────────┘                                    └──────────────────────────┘
```

External services in the target build: Neon Postgres, LiveKit (Cloud or self-hosted),
OpenFreeMap/OSM tiles, Neon Object Storage (S3-compatible) for listing photos, EAS for the
Android build.

## 2. Monorepo boundaries

```
landconnect/
├── apps/
│   ├── api/          Express server — deployable
│   └── mobile/       Expo app — buildable
├── packages/
│   └── shared/       Enums, event names, Zod schemas, DTO types
├── turbo.json        Task graph: typecheck/build depend on ^
├── pnpm-workspace    apps/* + packages/*
└── tsconfig.base.json
```

**Why split `shared`:** the client and server must agree on payload shapes and socket event
names. `packages/shared/src/index.ts` re-exports `constants`, `schemas`, `types`. Its `main` and
`types` both point at source TypeScript, so both Metro and tsx consume it without a separate
build step.

**Dependency direction:**

```
mobile ──▶ shared
api    ──▶ shared
shared ──▶ zod (only)
```

The mobile app never imports from `apps/api`; the API never imports React Native modules.

## 3. Runtime components

### 3.1 Mobile

| Component | Responsibility |
|---|---|
| `lib/auth.tsx` (`AuthProvider`) | Restores session, fetches `/auth/me`, exposes `user`, `accessToken`, `signIn`, `signUp`, `signOut` |
| `lib/session.ts` | Secure-store persistence, in-memory token cache, single-flight refresh |
| `lib/api.ts` | Typed fetch wrapper, bearer token injection, one retry after refresh, error normalisation |
| `lib/socket.ts` | Singleton Socket.IO connection with callback-based auth |
| `lib/config.ts` | `EXPO_PUBLIC_API_URL` |
| `src/app/**` | Routes (Expo Router file-based) |
| `components/**` | UI primitives, listing card, map preview |
| TanStack Query | Server-state cache, retries, invalidation after mutations |

### 3.2 API

| Component | Responsibility |
|---|---|
| `index.ts` | HTTP server, Socket.IO server, graceful shutdown |
| `app.ts` | Helmet, CORS, JSON body limit, routers, 404, error handler |
| `env.ts` | Environment parsing; LiveKit enabled flag |
| `lib/security.ts` | JWT sign/verify, refresh-token generation/hash, `requireAuth`, `requireRole`, `AppError` |
| `lib/prisma.ts` | Prisma client singleton |
| `lib/serialize.ts` | DB row → DTO (Decimal → number, Date → ISO, PII field selection) |
| `lib/livekit.ts` | 2-hour room-join token when configured |
| `routes/*.ts` | Auth, listings, conversations, calls |
| `realtime.ts` | Socket auth, user rooms, membership-checked conversation rooms, event relay |

### 3.3 Shared

- `ROLES`, `LISTING_STATUSES`, `MESSAGE_TYPES`, `CALL_KINDS`, `CALL_STATUSES` as `as const`
  arrays → runtime enums and TypeScript unions from one source.
- `SOCKET_EVENTS` → typo-proof event names.
- Zod schemas for every write boundary.
- DTO interfaces used by client and serializers.

## 4. Request lifecycle

### 4.1 Authenticated REST call

```
Screen → api.auth.me()
  → fetch GET /api/auth/me
     Authorization: Bearer <access>
  → requireAuth verifies JWT, attaches req.user
  → handler queries Prisma
  → toUserDto strips fields not in the DTO
  → JSON response
  → TanStack Query caches under a key
```

On `401`: the client marks the call, runs `refreshSession()` once (single-flight), stores the new
pair, and retries the original request exactly once. A failed refresh clears the session.

### 4.2 Listing creation

```
listing/create.tsx
  → local Zod safeParse (field-level error before network)
  → POST /api/listings (Bearer)
  → requireAuth → requireRole(SELLER, BROKER)
  → listingCreateSchema.parse
  → prisma.listing.create({ ownerId: req.user.id })
  → 201 ListingDto
  → router.replace(`/listing/:id`)
```

### 4.3 Message send

```
chat screen
  → POST /api/conversations/:id/messages
  → requireAuth → assertMember(conversationId, user.id)
  → prisma.message.create
  → prisma.conversation.update(lastMessageAt)
  → io.to(`conversation:${id}`).emit('message:new', dto)
  → 201 MessageDto
Both open clients append; duplicates are de-duplicated by message id on the sender.
```

## 5. Realtime architecture

```
socket handshake
  auth: { token: <access JWT> }
        │
        ▼
  io.use → verifyToken → socket.data.user
        │
        ├── auto-join `user:<id>`          (incoming call routing, any screen)
        │
        └── conversation:join (id)
              → ConversationParticipant lookup
              → if member: join `conversation:<id>`
```

- **User rooms** let a call reach the receiver even when the chat screen is not open.
- **Conversation rooms** are membership-checked once, then used for chat fan-out and WebRTC
  signalling relay.
- **Relay events** (`typing:*`, `webrtc:*`) are accepted only from sockets already in a
  conversation room; the server stamps `from: user.id`.
- Full catalog: [REALTIME_MESSAGING.md](REALTIME_MESSAGING.md).

## 6. Calling architecture

```
Caller                    API                          Receiver
  │  POST /api/calls        │                              │
  ├────────────────────────▶│ participant check            │
  │                         │ create CallSession RINGING   │
  │  201 CallDto            │ emit call:incoming           │
  │◀────────────────────────┤   → user:<receiver>          │
  │                         │   → conversation:<id>        ├──▶ ring UI
  │                         │                              │
  │                         │  POST /calls/:id/answer      │
  │                         │◀─────────────────────────────┤ accept
  │                         │ status=ACTIVE, startedAt     │
  │   call:accepted         │ LiveKit grant (optional)     │
  │◀────────────────────────┤─────────────────────────────▶│
  │                         │                              │
  │  ═══════════ media path (planned) ═══════════════════  │
  │   LiveKit SFU  or  Socket.IO SDP/ICE P2P relay         │
  │                         │                              │
  │  POST /calls/:id/end    │                              │
  ├────────────────────────▶│ status=ENDED                 │
  │   call:ended            │ emit call:ended              │
  │◀────────────────────────┤─────────────────────────────▶│
```

Server responsibilities: authorization, session state, room naming, token issuance, event
fan-out. Media never flows through the API.

## 7. Data ownership and serialization

- Prisma rows are never returned raw. `serialize.ts` is the only mapping boundary.
- `UserDto` includes `phone` **only** when returning the authenticated user (`/auth/me`,
  login/register). Listing owner, conversation participant and call DTOs omit it.
- `Decimal` columns (`price`, `areaAcres`) convert to `number` at the boundary so JSON remains
  numeric.
- `Date` values serialize to ISO strings.

## 8. Deployment topology (target)

```
EAS Build (cloud) ──▶ APK artifact ──▶ evaluator's Android device
                                          │
Neon Postgres ◀── Render/Fly/Railway API ─┘  (HTTPS + WSS)
                        │
                        ├── LiveKit Cloud (media)
                        └── Neon Object Storage: uploads (public_read)
```

The current dev topology is simpler: API on the developer machine, app on a phone over LAN,
Neon in the cloud.

## 9. Key decisions and trade-offs

| Decision | Benefit | Cost / mitigation |
|---|---|---|
| Monorepo + shared package | One contract, atomic changes | Metro watchFolders config required |
| Express 5 + Zod | Async errors centralised; validation reused | No OpenAPI generation yet |
| Prisma + Neon | Typed queries, free hosting | Cold starts; keep warm before demo |
| Socket.IO | Rooms, reconnect, one realtime channel | Needs Redis adapter to scale horizontally |
| LiveKit + P2P fallback | Reliability with zero paid dependency | Two media paths to test; ship one for demo |
| Custom UI tokens | WhatsApp look with no heavy library | No design-system theming beyond tokens |
| Refresh rotation | Strong theft detection | Slightly more client complexity |

## 10. Failure modes and handling

| Failure | Current behaviour | Improvement |
|---|---|---|
| Access token expired | Client refreshes once and retries | Transparent (done) |
| Refresh token reused | All user sessions revoked | Done |
| Socket drops | Socket.IO reconnects with latest token | Verified by callback auth |
| API unavailable | Generic network error surfaced in UI | Add retry banner/offline cache |
| DB cold start | First request slow | Warm the API before demo |
| Call receiver offline | Call stays RINGING | Add MISSED timeout job (KI-11) |
| LiveKit not configured | Token endpoint returns 503 | Client must use P2P or disable video |
| Media permission denied | Not handled yet | Add explicit permission UX (KI-03) |

## 11. Scaling path (if this were production)

1. Redis adapter for Socket.IO; sticky sessions.
2. Move call state transitions into a job/queue for timeouts and missed calls.
3. Rate limiting (per-IP and per-user) on auth/messages/calls.
4. Read replica or denormalised search index for the feed.
5. Object storage + CDN for images; signed uploads.
6. Structured logging, tracing, metrics, alerting.
7. Push notifications (FCM/APNs) + call kit for background ringing.
8. Audit log for listing and call actions.
