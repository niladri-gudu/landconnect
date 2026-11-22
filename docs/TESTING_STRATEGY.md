# Testing Strategy

**Baseline:** 2026-11-21
**Current state:** no automated test suite; `pnpm typecheck` passes, `/health` smoke-tested, and
the core flows are manually verified. This document defines the target and the exact manual
matrix to run before submission.
**Related:** [REQUIREMENTS.md](REQUIREMENTS.md) · [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) · [TASK_TRACKER.md](TASK_TRACKER.md)

---

## 1. Goals

1. Prove the requirement list works, not just that the code compiles.
2. Catch regressions in auth, permissions and call state transitions.
3. Give the reviewer confidence through a documented, repeatable QA pass.
4. Add cheap automated coverage where it buys the most safety under deadline pressure.

## 2. Test pyramid (target)

```
        ┌─────────────────────┐
        │ E2E (Maestro)       │  3–5 critical journeys
        ├─────────────────────┤
        │ Integration (API)   │  auth, listings, messages, calls
        ├─────────────────────┤
        │ Unit                │  Zod schemas, security, serializers
        └─────────────────────┘
```

### 2.1 Unit (fast, high value)

| Target | Cases |
|---|---|
| `hashRefreshToken` / `generateRefreshToken` | deterministic hash, entropy length, no plaintext storage |
| `signToken` / `verifyToken` | valid round-trip, expiry, wrong `typ`, tampered signature |
| Zod schemas | boundary lengths, coordinate ranges, price/area positivity, image count |
| `serialize.ts` | Decimal → number, Date → ISO, phone excluded from public user shape |

Suggested tooling: **Vitest** (works with tsx/ESM) or Node's built-in `node:test`.

### 2.2 Integration (API + real Postgres)

Use **Vitest + supertest**, with a dedicated test database (Neon branch or local Docker
Postgres). Reset between suites.

| Suite | Assertions |
|---|---|
| Auth | register 201, duplicate 409, login 200/401, refresh rotation, reuse revokes family, logout revokes |
| Roles | buyer create listing 403; seller 201; non-owner patch 403; owner patch 200 |
| Listings | feed only ACTIVE, filters, pagination totals, delete |
| Conversations | idempotent create, self-conversation 400, non-member 403, message persists and updates lastMessageAt |
| Calls | create 201 RINGING, non-member 403, receiver answer accept → ACTIVE, reject → REJECTED, initiator answer 403, double answer 409, end idempotent, token 503 without LiveKit |

Events can be asserted by injecting a fake Socket.IO server and spying on `io.to(...).emit`.

### 2.3 UI / component

React Native Testing Library for:
- Login form validation and error rendering.
- Role-gated My Listings state.
- Listing card rendering and price formatting.
- Call screen state transitions given a mocked call DTO.

Lower priority than API integration under the deadline.

### 2.4 E2E (Maestro)

Flows worth automating:
1. Login → feed → open listing → detail.
2. Buyer messages seller → message appears.
3. Seller creates a listing → appears in feed.
4. Two-device calling is manual (Maestro cannot drive two devices reliably here).

## 3. Minimal automated plan (if time allows)

```json
// apps/api/package.json (illustrative)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2",
    "supertest": "^7",
    "@types/supertest": "^6"
  }
}
```

Priority order:
1. Auth integration tests (highest risk/regression value).
2. Role/permission tests.
3. Call state transition tests.
4. Zod boundary tests.

## 4. Manual QA matrix (must run before submission)

### 4.1 Auth

| # | Steps | Expected |
|---|---|---|
| A1 | Register buyer with new email | Lands on feed |
| A2 | Register duplicate email | Error shown, stays on form |
| A3 | Password 7 chars | Field error |
| A4 | Login wrong password | Generic invalid message |
| A5 | Kill and reopen app | Still logged in |
| A6 | Wait for access expiry (or force 401) | Transparent refresh |
| A7 | Logout and reopen | Login screen |
| A8 | Reuse old refresh token via curl | 401; other sessions revoked |

### 4.2 Roles and listings

| # | Steps | Expected |
|---|---|---|
| L1 | Buyer opens My Listings | Explanatory state, no create CTA |
| L2 | Buyer `POST /api/listings` | 403 |
| L3 | Seller creates listing with GPS | Appears at top of feed |
| L4 | Seller deletes own listing | Removed from feed/my listings |
| L5 | Second seller PATCHes first seller's listing | 403 |
| L6 | Create with price "25,00,000" | Parses and displays ₹25,00,000 |
| L7 | Create with latitude 100 | Field error |
| L8 | Detail shows description, price, area, city, owner | All correct |
| L9 | Anonymous feed request | 200, ACTIVE only |

### 4.3 Messaging

| # | Steps | Expected |
|---|---|---|
| M1 | Buyer taps Message seller | Chat opens with conversation |
| M2 | Buyer sends text | Appears immediately for sender |
| M3 | Seller has chat open | Message arrives live |
| M4 | Seller replies | Buyer receives live |
| M5 | Conversation list | Shows counterpart + last message |
| M6 | Reopen app | History persists |
| M7 | Non-member opens conversation id | 403 |
| M8 | Socket reconnect (toggle Wi-Fi) | New messages still arrive after fix |

### 4.4 Calling (critical)

| # | Steps | Expected |
|---|---|---|
| C1 | Audio call, both on Wi-Fi | Both hear; end works |
| C2 | Video call | Both see/hear; toggles work |
| C3 | Receiver on mobile data | Connects |
| C4 | Receiver rejects | Caller informed, returns |
| C5 | Receiver ends active call | Caller returns |
| C6 | Caller cancels before answer | Ends cleanly |
| C7 | Receiver on feed/other tab | Incoming UI appears |
| C8 | Deny microphone | Clear message, no crash |
| C9 | Deny camera on video | Audio-only or clear message |
| C10 | Background app mid-call | Documented behaviour, no crash |
| C11 | Start a second call while active | Defined (reject/busy) |
| C12 | Inspect call/conversation JSON | No phone/email |

### 4.5 Maps and images

| # | Steps | Expected |
|---|---|---|
| G1 | Use my location | Coordinates update |
| G2 | Deny location | Helpful message, manual entry works |
| G3 | Open map | Marker at the listing |
| G4 | Tap map card | OSM opens at coordinates |
| G5 | Upload images | Thumbnails and listing cover show |

## 5. Smoke tests

```bash
# API boots
pnpm api
curl -s http://localhost:4000/health
# {"ok":true,"service":"landconnect-api"}

# Auth round trip
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@landconnect.dev","password":"password123"}'

# Public feed
curl -s 'http://localhost:4000/api/listings?pageSize=5'
```

Type checking:

```bash
pnpm typecheck
```

## 6. CI (optional, small)

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm typecheck
```

Add `pnpm --filter @landconnect/api test` once integration tests exist (requires a Postgres
service container).

## 7. Test data

- Seed accounts: buyer/seller/broker, password `password123`.
- Three listings with real coordinates.
- For call tests, ensure the two test accounts have a conversation (start it from a listing).
- Use disposable databases/branches; never run destructive tests against the demo database.

## 8. Bug severity and exit criteria

| Severity | Definition | Exit criterion |
|---|---|---|
| Blocker | Cannot log in, cannot call, crash | Zero before submission |
| Critical | A core flow fails on one platform | Zero before submission |
| Major | Feature partially broken, workaround exists | Document in KNOWN_ISSUES |
| Minor | Cosmetic or rare edge case | Document, fix if time |

**Submission gate:** no blockers or criticals; all C1–C9 call tests pass; all L1–L5 role tests
pass; no phone number leaks.

## 9. What is explicitly not tested

- Load/performance testing.
- Security penetration testing.
- Multi-party calls.
- Background/terminated push delivery.
- iOS device matrix (build kept, Android is the evaluated target).
