# REST API Specification

**Base URL (dev):** `http://localhost:4000`
**Base URL (deployed):** `https://<api-host>`
**Content type:** `application/json`
**Auth:** `Authorization: Bearer <accessToken>` unless marked public
**Source:** `apps/api/src/routes/*.ts`, `apps/api/src/app.ts`

---

## 1. Conventions

### 1.1 Error shape

```json
{ "error": "Human-readable message", "details": { "optional": "validator output" } }
```

| Status | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation failed (`details` = Zod `flatten()`) |
| 401 | Missing/invalid/expired token, bad credentials |
| 403 | Authenticated but not permitted |
| 404 | Resource or route not found |
| 409 | Conflict (duplicate email, wrong call state) |
| 500 | Unhandled server error |
| 503 | LiveKit not configured |

Express 5 forwards rejected async handlers to the central error middleware. Zod errors become
400 with field details; `AppError` carries its status; everything else is 500 and logged.

### 1.2 DTOs

**UserDto** (self only — includes phone):
```json
{
  "id": "uuid",
  "name": "Asha Buyer",
  "email": "buyer@landconnect.dev",
  "phone": "+919800000001",
  "role": "BUYER",
  "avatarUrl": null,
  "createdAt": "2026-11-21T10:00:00.000Z"
}
```

**Public user summary** (owner/participant — no phone):
```json
{ "id": "uuid", "name": "Ravi Seller", "role": "SELLER", "avatarUrl": null }
```

**ListingDto:**
```json
{
  "id": "uuid",
  "title": "5-acre farm land with borewell near Devanahalli",
  "description": "Level agricultural land with a working borewell…",
  "price": 8500000,
  "areaAcres": 5,
  "address": "Devanahalli taluk, Bengaluru Rural",
  "city": "Bengaluru",
  "state": "Karnataka",
  "country": "India",
  "latitude": 13.2437,
  "longitude": 77.7139,
  "images": [],
  "status": "ACTIVE",
  "ownerId": "uuid",
  "owner": { "id": "uuid", "name": "Ravi Seller", "role": "SELLER", "avatarUrl": null },
  "createdAt": "2026-11-21T10:00:00.000Z",
  "updatedAt": "2026-11-21T10:00:00.000Z"
}
```

**Paginated<T>:** `{ "items": T[], "page": 1, "pageSize": 12, "total": 3 }`

---

## 2. Health

### `GET /health` — public
**200**
```json
{ "ok": true, "service": "landconnect-api", "uptimeSeconds": 42 }
```

### `GET /health/db` — public
Runs `SELECT 1` against Postgres. Use it to distinguish an API that is up from a Neon
database that is cold or unreachable.

**200**
```json
{ "ok": true, "db": "up", "latencyMs": 145 }
```

**503** — the API is running but Postgres is not reachable.
```json
{ "ok": false, "db": "down" }
```

---

## 3. Authentication — `/api/auth`

### `POST /api/auth/register` — public

**Body**
```json
{
  "name": "Asha Buyer",
  "email": "asha@example.com",
  "password": "password123",
  "role": "BUYER",
  "phone": "+919800000001"
}
```

| Field | Rules |
|---|---|
| `name` | 2–80 chars, trimmed |
| `email` | valid, lowercased, trimmed, unique |
| `password` | 8–72 chars |
| `role` | `BUYER` \| `SELLER` \| `BROKER` |
| `phone` | optional, `^\+?[0-9]{7,15}$`, unique |

**201** — `AuthResponse` (`accessToken`, `refreshToken`, `user`)
**409** — email already registered
**400** — validation failure

### `POST /api/auth/login` — public

```json
{ "email": "buyer@landconnect.dev", "password": "password123" }
```

**200** `AuthResponse` · **401** `{ "error": "Invalid email or password" }` (no user enumeration)

### `POST /api/auth/refresh` — public (refresh token as body)

```json
{ "refreshToken": "<opaque 48-byte value>" }
```

**200** `AuthResponse` with a **new** access + refresh pair.
**401** for unknown, expired, already-used, or reused tokens. Reuse revokes every active session
for that user.

### `POST /api/auth/logout` — public (refresh token as body)

```json
{ "refreshToken": "<opaque>" }
```

**200** `{ "ok": true }` — idempotent; revokes the presented token if active.

### `GET /api/auth/me` — Bearer

**200** `UserDto` · **401** invalid/expired access token · **404** user deleted

**AuthResponse**
```json
{
  "accessToken": "eyJ…",
  "refreshToken": "opaque…",
  "user": { "id": "…", "name": "…", "email": "…", "phone": "…", "role": "BUYER", "avatarUrl": null, "createdAt": "…" }
}
```

---

## 4. Listings — `/api/listings`

### `GET /api/listings` — public

Query (all optional):

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string ≤120 | — | case-insensitive search over title, description, city |
| `city` | string ≤100 | — | case-insensitive contains |
| `minPrice` | number ≥0 | — | inclusive |
| `maxPrice` | number >0 | — | inclusive |
| `page` | int ≥1 | 1 | |
| `pageSize` | int 1–50 | 12 | |

Only `status = ACTIVE`. Newest first. Items include owner summary.

**200**
```json
{
  "items": [ /* ListingDto */ ],
  "page": 1,
  "pageSize": 12,
  "total": 3
}
```

### `GET /api/listings/mine` — Bearer

All statuses owned by the caller, newest first, unpaginated.

**200** `{ items, page: 1, pageSize: <count>, total: <count> }`

### `GET /api/listings/:id` — public

**200** `ListingDto` · **404** not found (any status is returned by id)

### `POST /api/listings` — Bearer, role `SELLER` or `BROKER`

```json
{
  "title": "2-acre residential plot, gated layout",
  "description": "Corner plot in an approved gated layout with blacktop roads…",
  "price": 12500000,
  "areaAcres": 2,
  "address": "Sarjapur Road, Bengaluru",
  "city": "Bengaluru",
  "state": "Karnataka",
  "country": "India",
  "latitude": 12.8639,
  "longitude": 77.7876,
  "images": ["https://<branch>-storage.<region>.aws.neon.tech/uploads/listings/<userId>/<uuid>.jpg"],
  "status": "ACTIVE"
}
```

| Field | Rules |
|---|---|
| `title` | 5–120 |
| `description` | 20–4000 |
| `price` | positive, ≤ 1e12 |
| `areaAcres` | positive, ≤ 1e6 |
| `address` | 3–300 |
| `city`, `state` | 2–100 |
| `country` | 2–100, default `India` |
| `latitude` | −90..90 |
| `longitude` | −180..180 |
| `images` | ≤ 10 URLs, default `[]` |
| `status` | optional; default `ACTIVE` |

**201** `ListingDto` · **400** validation · **401** · **403** buyer or wrong role

### `PATCH /api/listings/:id` — Bearer, role SELLER/BROKER, owner only

Any subset of the create fields. **200** `ListingDto`.
**403** not owner · **404** not found · **400** validation.
No edit screen uses this yet (KI-06).

### `DELETE /api/listings/:id` — Bearer, role SELLER/BROKER, owner only

**200** `{ "ok": true }` · **403** not owner · **404** not found.
Hard delete; conversations survive with `listingId = null`.

---

## 5. Uploads — `/api/uploads`

### `POST /api/uploads` — Bearer, role `SELLER` or `BROKER`

Multipart form with one to four `files` parts. JPEG, PNG or WebP only, ≤8 MB each.

Uploads to the linked Neon Object Storage bucket (`uploads`) under
`listings/<userId>/<uuid>.<ext>`. The bucket is `public_read`, so the returned URLs are permanent
for this branch.

**201**
```json
{ "urls": ["https://<branch>-storage.<region>.aws.neon.tech/uploads/listings/<userId>/<uuid>.jpg"] }
```

**400** no files · **401** · **403** buyer or wrong role · **413** file too large ·
**415** unsupported type · **503** object storage not configured on the server.

---

## 6. Conversations — `/api/conversations`

### `GET /api/conversations` — Bearer

Conversations the caller participates in, newest activity first.

**200**
```json
[
  {
    "id": "uuid",
    "listingId": "uuid",
    "listingTitle": "2-acre residential plot, gated layout",
    "participants": [
      { "id": "uuid", "name": "Asha Buyer", "role": "BUYER", "avatarUrl": null },
      { "id": "uuid", "name": "Ravi Seller", "role": "SELLER", "avatarUrl": null }
    ],
    "lastMessage": {
      "id": "uuid",
      "body": "Is the price negotiable?",
      "senderId": "uuid",
      "createdAt": "2026-11-21T10:05:00.000Z"
    },
    "lastMessageAt": "2026-11-21T10:05:00.000Z",
    "createdAt": "2026-11-21T10:00:00.000Z"
  }
]
```

### `POST /api/conversations` — Bearer

```json
{ "listingId": "uuid", "participantId": "uuid" }
```

Idempotent: if a conversation exists for this listing with both users, returns it (200).
Cannot message yourself (400). Both listing and participant must exist (404).

**201** new conversation DTO · **200** existing conversation DTO.

### `GET /api/conversations/:id/messages` — Bearer, participant

**200** `MessageDto[]` ascending, up to 200 (oldest 200 — see KI-10).
**403** not a participant.

```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "senderId": "uuid",
  "body": "Is the price negotiable?",
  "type": "TEXT",
  "createdAt": "2026-11-21T10:05:00.000Z"
}
```

### `POST /api/conversations/:id/messages` — Bearer, participant

```json
{ "body": "Is the price negotiable?", "type": "TEXT" }
```

`body` 1–2000; `type` defaults `TEXT`. Creates the message, updates `lastMessageAt`, emits
`message:new` to `conversation:<id>`.

**201** `MessageDto` · **403** not a participant · **400** validation.

---

## 7. Calls — `/api/calls`

### `POST /api/calls` — Bearer, conversation participant

```json
{ "conversationId": "uuid", "kind": "AUDIO" }
```

Receiver is derived as the other participant. Creates a `CallSession` with status `RINGING` and
a unique `roomName`. Emits `call:incoming` to `user:<receiverId>` and `conversation:<id>`.

**201**
```json
{
  "id": "uuid",
  "conversationId": "uuid",
  "initiatorId": "uuid",
  "receiverId": "uuid",
  "kind": "AUDIO",
  "status": "RINGING",
  "roomName": "landconnect-<uuid>",
  "createdAt": "2026-11-21T10:10:00.000Z",
  "startedAt": null,
  "endedAt": null
}
```

**403** not a participant · **400** no other participant · **400** validation.

### `GET /api/calls/:id` — Bearer, participant

**200** `CallDto` · **403** not a participant · **404** not found.

### `GET /api/calls/:id/token` — Bearer, participant

Only when the call is `ACTIVE`. Returns a LiveKit room-join grant when configured.

**200**
```json
{ "url": "wss://<livekit-host>", "room": "landconnect-<uuid>", "token": "eyJ…" }
```

**409** call not active · **503** LiveKit not configured · **403/404** as above.

### `POST /api/calls/:id/answer` — Bearer, **receiver only**

```json
{ "accept": true }
```

- `accept: false` → status `REJECTED`, `endedAt` set, emits `call:rejected`.
- `accept: true` → status `ACTIVE`, `startedAt` set, emits `call:accepted`.

**200**
```json
{
  "call": { /* CallDto */ },
  "livekit": { "url": "wss://…", "room": "landconnect-…", "token": "eyJ…" }
}
```
`livekit` is omitted when not configured.

**403** initiator attempting to answer · **409** call not `RINGING` · **400** validation.

### `POST /api/calls/:id/end` — Bearer, participant

Sets `ENDED` and `endedAt`, emits `call:ended`. Idempotent for already-`ENDED`/`REJECTED` calls.

**200** `CallDto` · **403/404**.

---

## 8. Realtime events (summary)

Connection: `io(API_URL, { auth: { token: accessToken } })`.
Full catalog: [REALTIME_MESSAGING.md](REALTIME_MESSAGING.md).

| Direction | Event | Payload |
|---|---|---|
| client → server | `conversation:join` / `conversation:leave` | `conversationId` |
| client → server | `typing:start` / `typing:stop` | `{ conversationId }` |
| client → server | `webrtc:offer` / `webrtc:answer` / `webrtc:ice` | `{ conversationId, … }` |
| server → client | `message:new` | `MessageDto` |
| server → client | `call:incoming` | `CallDto` |
| server → client | `call:accepted` | `CallDto` |
| server → client | `call:rejected` | `CallDto` |
| server → client | `call:ended` | `CallDto` |

---

## 9. Operational notes

- **CORS:** `CORS_ORIGIN` defaults to `*`; set a comma-separated allowlist for deployment.
- **Body limit:** 2 MB JSON.
- **Rate limiting:** none yet (KI-08). Add before a public deployment.
- **Idempotency:** conversation creation is idempotent; call creation is not (each tap creates
  a new session). Guard the client against double taps.
- **Versioning:** no `/v1` prefix; acceptable for the prototype.
