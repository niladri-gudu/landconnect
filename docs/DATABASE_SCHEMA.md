# Database Schema

**Source of truth:** `apps/api/prisma/schema.prisma`
**Baseline:** 2026-11-21
**Database:** PostgreSQL (Neon) · **ORM:** Prisma 6

7 models, 5 enums. The API uses the pooled connection (`DATABASE_URL`); Prisma migrations use
the direct connection (`DIRECT_URL`).

---

## 1. Entity relationship diagram

```
                    ┌───────────────────────┐
                    │        User           │
                    │───────────────────────│
                    │ id (uuid, pk)         │
                    │ name                  │
                    │ email (unique)        │
                    │ phone (unique, null)  │
                    │ passwordHash          │
                    │ role                  │
                    │ avatarUrl             │
                    └───┬───────┬───────┬───┘
                        │1      │1      │1
              owns      │       │       │ refresh
                        │N      │N      │N
              ┌─────────▼──┐    │   ┌───▼──────────────┐
              │  Listing   │    │   │  RefreshToken    │
              │────────────│    │   │──────────────────│
              │ id pk      │    │   │ id pk            │
              │ ownerId fk │    │   │ userId fk        │
              │ title      │    │   │ tokenHash unique │
              │ price      │    │   │ expiresAt        │
              │ lat / lng  │    │   │ revokedAt        │
              │ images[]   │    │   │ replacedBy...    │
              │ status     │    │   └──────────────────┘
              └───┬────────┘    │
                  │1            │ participant
                  │N            │N
        ┌─────────▼─────────────▼──────────┐
        │           Conversation           │
        │──────────────────────────────────│
        │ id pk                            │
        │ listingId fk (nullable, SetNull) │
        │ lastMessageAt                    │
        └───┬───────────────────────┬──────┘
            │1                      │1
            │N                      │N
   ┌────────▼─────────────┐  ┌─────▼──────────────┐
   │ ConversationParticip.│  │     Message        │
   │──────────────────────│  │────────────────────│
   │ conversationId fk    │  │ id pk              │
   │ userId fk            │  │ conversationId fk  │
   │ PK(conversationId,   │  │ senderId fk        │
   │    userId)           │  │ body               │
   └──────────────────────┘  │ type               │
                             └────────────────────┘

   User 1─N CallSession (initiator)
   User 1─N CallSession (receiver)
   Conversation 1─N CallSession
```

---

## 2. Enums

| Enum | Values | Notes |
|---|---|---|
| `Role` | `BUYER`, `SELLER`, `BROKER` | Default `BUYER`; only SELLER/BROKER can create listings |
| `ListingStatus` | `ACTIVE`, `SOLD`, `ARCHIVED` | Public feed shows only `ACTIVE` |
| `MessageType` | `TEXT`, `IMAGE`, `CALL` | Only `TEXT` used by the UI today |
| `CallKind` | `AUDIO`, `VIDEO` | Chosen when initiating |
| `CallStatus` | `RINGING`, `ACTIVE`, `ENDED`, `REJECTED`, `MISSED` | `MISSED` not yet produced (no timeout job) |

---

## 3. Models

### 3.1 User

| Column | Type | Constraints |
|---|---|---|
| `id` | String (uuid) | PK, default `uuid()` |
| `name` | String | required |
| `email` | String | unique, required |
| `phone` | String? | unique, optional; never returned to other users |
| `passwordHash` | String | bcrypt, cost 10 |
| `role` | Role | default `BUYER` |
| `avatarUrl` | String? | optional |
| `createdAt` | DateTime | default now |
| `updatedAt` | DateTime | `@updatedAt` |

Relations: owned listings, conversation participations, sent messages, initiated calls,
received calls, refresh tokens.

### 3.2 RefreshToken

| Column | Type | Constraints |
|---|---|---|
| `id` | String (uuid) | PK |
| `userId` | String | FK → User, cascade delete |
| `tokenHash` | String | unique; SHA-256 of the opaque token |
| `expiresAt` | DateTime | 30 days by default |
| `revokedAt` | DateTime? | set on rotation/logout |
| `replacedByTokenHash` | String? | rotation audit link |
| `createdAt` | DateTime | default now |

Indexes: `userId`, `expiresAt`. Expired rows are not pruned automatically yet (KI-13).

### 3.3 Listing

| Column | Type | Constraints / rules |
|---|---|---|
| `id` | String (uuid) | PK |
| `title` | String | 5–120 chars (Zod) |
| `description` | String | 20–4000 chars (Zod) |
| `price` | Decimal(14,2) | > 0, ≤ 1e12 (Zod) |
| `areaAcres` | Decimal(10,2) | > 0, ≤ 1e6 (Zod) |
| `address` | String | 3–300 chars |
| `city` | String | 2–100 chars |
| `state` | String | 2–100 chars |
| `country` | String | default `"India"` |
| `latitude` | Float | −90..90 (Zod) |
| `longitude` | Float | −180..180 (Zod) |
| `images` | String[] | up to 10 URL strings (Zod) |
| `status` | ListingStatus | default `ACTIVE` |
| `ownerId` | String | FK → User, cascade delete |
| `createdAt` / `updatedAt` | DateTime | timestamps |

Indexes: `city`, `ownerId`, `price`, `status`.
`price` and `areaAcres` are `Decimal` in Postgres and converted with `Number()` in
`serialize.ts`.

### 3.4 Conversation

| Column | Type | Constraints |
|---|---|---|
| `id` | String (uuid) | PK |
| `listingId` | String? | FK → Listing, `onDelete: SetNull` |
| `lastMessageAt` | DateTime | default now; updated on every message |
| `createdAt` | DateTime | default now |

Index: `lastMessageAt` (conversation list ordering).

### 3.5 ConversationParticipant

| Column | Type | Constraints |
|---|---|---|
| `conversationId` | String | FK → Conversation, cascade delete |
| `userId` | String | FK → User, cascade delete |

Composite PK `(conversationId, userId)`. Index on `userId`.
The application creates exactly two participants; the database does not enforce the count.

### 3.6 Message

| Column | Type | Constraints |
|---|---|---|
| `id` | String (uuid) | PK |
| `conversationId` | String | FK → Conversation, cascade delete |
| `senderId` | String | FK → User, cascade delete |
| `body` | String | 1–2000 chars (Zod) |
| `type` | MessageType | default `TEXT` |
| `createdAt` | DateTime | default now |

Index: `(conversationId, createdAt)` — history reads.

### 3.7 CallSession

| Column | Type | Constraints |
|---|---|---|
| `id` | String (uuid) | PK |
| `conversationId` | String | FK → Conversation, cascade delete |
| `initiatorId` | String | FK → User, cascade delete |
| `receiverId` | String | FK → User, cascade delete |
| `kind` | CallKind | AUDIO / VIDEO |
| `status` | CallStatus | default `RINGING` |
| `roomName` | String | unique; `landconnect-<uuid>` |
| `createdAt` | DateTime | default now |
| `startedAt` | DateTime? | set on accept |
| `endedAt` | DateTime? | set on reject/end |

Indexes: `conversationId`, `(receiverId, status)` — incoming-call lookup.
There is no `answeredAt` separate from `startedAt`, and no duration column (derivable).

---

## 4. Referential actions

| Parent deleted | Child behaviour |
|---|---|
| User | Listings, messages, participations, refresh tokens, calls cascade |
| Listing | Conversation `listingId` → `NULL` (history preserved) |
| Conversation | Messages, participants, calls cascade |

Deleting a listing therefore does **not** delete its conversations — buyers keep their chat
history after a plot is removed. The UI shows a null listing title.

---

## 5. Invariants

**Enforced by the database:** unique email, unique phone, unique refresh hash, unique room name,
unique participant pair, foreign keys.

**Enforced by application/Zod only:**
- Exactly two participants per conversation.
- Listing owner is a SELLER or BROKER with the matching owner id.
- Call initiator/receiver are conversation participants.
- Price/area positivity and coordinate ranges.
- `images` length ≤ 10 and each entry a URL.
- `MISSED` transition and timeouts.
- Refresh-token expiry pruning.

**Not modelled:** properties, units, documents, saved searches, reviews, reports, blocks,
notifications, meeting-room schedules.

---

## 6. Serialization boundary

`apps/api/src/lib/serialize.ts` converts rows to DTOs:

| DB | DTO |
|---|---|
| `Decimal` | `number` |
| `Date` | ISO `string` |
| User (self) | includes `phone` |
| User (listing owner / participant) | `{id, name, role, avatarUrl}` only |
| Call | no user PII, only ids + kind/status/room/timestamps |

Any new endpoint must go through a serializer rather than returning Prisma objects.

---

## 7. Migrations and seeding

Prototype flow:

```bash
pnpm db:generate    # prisma generate
pnpm db:push        # sync schema to Neon (no migration history)
pnpm db:seed        # demo users + 3 listings
```

Production-minded flow:

```bash
pnpm db:migrate     # prisma migrate dev against DIRECT_URL
```

`db:push` is used for speed during the assignment; a real project should switch to committed
migrations before deployment. The seed is idempotent by email/title (`upsert`/`findFirst`).

### Seed data

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@landconnect.dev | password123 |
| Seller | seller@landconnect.dev | password123 |
| Broker | broker@landconnect.dev | password123 |

Three Karnataka/Tamil Nadu listings with real coordinates (Bengaluru, Sarjapur, Hosur).

---

## 8. Query patterns

| Use case | Query shape |
|---|---|
| Feed | `WHERE status=ACTIVE [filters] ORDER BY createdAt DESC SKIP/TAKE` + count in one transaction |
| My listings | `WHERE ownerId = me ORDER BY createdAt DESC` |
| Conversation list | `WHERE participants.some(userId=me) ORDER BY lastMessageAt DESC`, include participants + latest message |
| Chat history | `WHERE conversationId ORDER BY createdAt ASC TAKE 200` |
| Incoming call | `WHERE receiverId=me AND status=RINGING` (index present) |

KI-10: chat history takes the **oldest** 200 messages, so conversations longer than 200 lose the
newest messages. Fix by ordering `DESC`, taking 200, then reversing, or add cursor pagination.

---

## 9. Schema limitations

1. No `MeetingRoom` model; conversations double as rooms.
2. No `CallParticipant` table — calls are strictly 1:1.
3. No notification/outbox table.
4. No audit columns beyond timestamps.
5. No geography type (PostGIS); coordinates are floats, so radius search needs Haversine SQL.
6. No soft delete for listings; status `ARCHIVED` is the intended alternative.
7. No per-user unread counters or read receipts.
8. `images String[]` is Postgres-specific; a join table would be more portable.
