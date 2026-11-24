# Requirements and Traceability

**Baseline:** 2026-11-24
**Legend:** ✅ implemented · 🟡 partial · ⬜ not started
Status refers to the repository at the baseline date; update this file when items land.

---

## 1. Functional requirements

### FR-AUTH — Authentication and roles

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-AUTH-01 | Register with name, email, password, role | Account created, tokens returned, duplicate email → 409 | ✅ | `routes/auth.ts`, `(auth)/register.tsx` |
| FR-AUTH-02 | Secure login | Correct credentials → token pair; wrong → 401 with generic message | ✅ | `routes/auth.ts`, `(auth)/login.tsx` |
| FR-AUTH-03 | Three roles | `BUYER`, `SELLER`, `BROKER` selectable and persisted | ✅ | `schema.prisma`, `constants.ts` |
| FR-AUTH-04 | Session survives restart | Tokens in secure storage; `/auth/me` restores user | ✅ | `lib/session.ts`, `lib/auth.tsx` |
| FR-AUTH-05 | Transparent refresh | 401 triggers one refresh + retry; concurrent 401s share one refresh | ✅ | `lib/api.ts`, `lib/session.ts` |
| FR-AUTH-06 | Logout revokes refresh token | `POST /auth/logout` marks token revoked; local state cleared | ✅ | `routes/auth.ts`, `lib/auth.tsx` |
| FR-AUTH-07 | Refresh-token theft detection | Reusing a rotated token revokes all active sessions for that user | ✅ | `routes/auth.ts` |
| FR-AUTH-08 | Email verification / password reset | — | ⬜ (out of scope) | — |

### FR-ROLE — Authorization

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-ROLE-01 | Only sellers/brokers create listings | Buyer `POST /api/listings` → 403 | ✅ | `requireRole('SELLER','BROKER')` |
| FR-ROLE-02 | Only owner mutates a listing | Non-owner PATCH/DELETE → 403 | ✅ | `findOwnedListing()` |
| FR-ROLE-03 | Only participants read a conversation | Non-member → 403 | ✅ | `assertMember()` |
| FR-ROLE-04 | Only participants act on a call | Non-participant GET/answer/end → 403 | ✅ | `findCallForUser()` |
| FR-ROLE-05 | UI reflects role | Buyers see an explanatory state instead of seller controls | ✅ | `(tabs)/listings.tsx` |
| FR-ROLE-06 | Server is the authority | Removing UI controls does not grant access | ✅ | guards run before handlers |

### FR-LIST — Listings

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-LIST-01 | Browse active listings | Feed paginated, newest first | ✅ | `GET /api/listings`, `(tabs)/index.tsx` |
| FR-LIST-02 | Search/filter | Keyword, city, min/max price accepted | ✅ (API); 🟡 (UI exposes keyword only) | `listingQuerySchema`, feed search |
| FR-LIST-03 | Show images, description, price, location | Detail screen shows all fields | ✅ | `listing/[id].tsx` |
| FR-LIST-04 | Create listing | Valid payload → 201 and visible in feed | ✅ | `listing/create.tsx` |
| FR-LIST-05 | Upload property images | Pick from gallery and upload | ✅ picker → `POST /api/uploads` → Neon Object Storage | `listing/create.tsx` |
| FR-LIST-06 | Geotag listing | GPS or manual coordinates captured | ✅ | `expo-location` in create screen |
| FR-LIST-07 | Edit listing | Owner edits fields from the app | ✅ edit mode of the same form; prefills, keeps/removes existing photos, PATCHes | `listing/create.tsx`, `(tabs)/listings.tsx`, `PATCH /api/listings/:id` |
| FR-LIST-08 | Delete/archive listing | Owner removes listing; delete cascades safely | ✅ delete; 🟡 status change via API only | `(tabs)/listings.tsx`, `routes/listings.ts` |
| FR-LIST-09 | Ownership checks | Non-owner cannot mutate | ✅ | `findOwnedListing()` |
| FR-LIST-10 | Validation | Bad price/coords/empty fields rejected with useful errors | ✅ | Zod schemas + client pre-validation |

### FR-MAP — Maps and geolocation

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-MAP-01 | Display listing location on a map | Marker visible in-app | ✅ embedded MapLibre + OpenFreeMap map; schematic fallback when the native module is absent | `listing-map.tsx` |
| FR-MAP-02 | Location selection when creating | User picks point on a map | ✅ tap-to-place picker plus GPS and manual coordinates | `listing-map.tsx`, `listing/create.tsx` |
| FR-MAP-03 | Open location externally | Tap opens exact coordinates | ✅ | `map-preview.tsx` |
| FR-MAP-04 | Free tile source | No paid API key required | ✅ plan (OpenFreeMap/OSM) | [MAPS_AND_GEOLOCATION.md](MAPS_AND_GEOLOCATION.md) |

### FR-MSG — Messaging and rooms

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-MSG-01 | Start conversation from listing | Creates or reuses conversation with owner | ✅ | `POST /api/conversations` |
| FR-MSG-02 | Send/receive text | Persisted; live delivery to open chat | ✅ | `routes/conversations.ts`, `chat/[conversationId].tsx` |
| FR-MSG-03 | Conversation list | Shows counterpart, listing context, last message | ✅ | `(tabs)/messages.tsx` |
| FR-MSG-04 | Meeting room | Persistent room for participants | 🟡 conversation room over Socket.IO; no scheduling | `realtime.ts` |
| FR-MSG-05 | Typing indicator | Ephemeral typing events | 🟡 server relays; client does not emit/display yet | `realtime.ts` |
| FR-MSG-06 | Read receipts / attachments | Delivered/read state per message | ✅ receipts and unread counts; 🟡 attachments (text only) | `chat/[conversationId].tsx` |
| FR-MSG-07 | New-message notification | User notices a message outside the chat | ✅ in-app banner + Messages tab badge while foreground; lists/history refresh on reconnect | `components/message-banner.tsx` |

### FR-CALL — Audio and video calling (key requirement)

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-CALL-01 | Initiate audio call | Creates session and rings receiver | ✅ | `POST /api/calls`, `call/[callId].tsx` |
| FR-CALL-02 | Initiate video call | Same with `kind: VIDEO` | ✅ | same |
| FR-CALL-03 | Receive incoming call | Receiver notified in-app | ✅ app-level ring overlay; a ring missed during a socket gap is replayed on reconnect/foreground | `components/incoming-call.tsx`, `realtime.ts` |
| FR-CALL-04 | Accept | Both sides transition to ACTIVE | ✅ state + LiveKit grant; media joined | `POST /calls/:id/answer` |
| FR-CALL-05 | Reject | Call → REJECTED; caller informed | ✅ | `call:rejected` |
| FR-CALL-06 | End | Either party ends; both informed | ✅ screen closes immediately; server records, notifies and logs a CALL entry in chat | `POST /calls/:id/end` |
| FR-CALL-07 | No phone numbers | No numbers in call surfaces | ✅ | DTOs exclude phone |
| FR-CALL-08 | Real audio media | Two devices hear each other | ✅ verified 2026-11-23 (phone ↔ emulator, RTP both ways) | [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) |
| FR-CALL-09 | Real video media | Two devices see each other | 🟡 wired (local/remote tracks, camera toggle); final two-device check pending | same |
| FR-CALL-10 | Missed call handling | Unanswered call becomes MISSED | 🟡 caller timer ends it and chat logs "Missed audio call"; DB status remains ENDED | KI-11 |
| FR-CALL-11 | Background/terminated notification | Push or call kit | ⬜ out of scope for prototype; demo in foreground | KI-12 |

### FR-PRIV — Privacy

| ID | Requirement | Acceptance criteria | Status | Evidence |
|---|---|---|---|---|
| FR-PRIV-01 | Phone never public | Listing owner, conversation, call DTOs omit phone | ✅ | `serialize.ts` |
| FR-PRIV-02 | Contact stays in-app | Only in-app chat/call actions on listings | ✅ | `listing/[id].tsx` |
| FR-PRIV-03 | Minimal PII | Only name, email, optional phone stored | ✅ | `schema.prisma` |
| FR-PRIV-04 | Secure token storage | OS keychain/keystore on device | ✅ | `expo-secure-store` |
| FR-PRIV-05 | Block/report users | — | ⬜ out of scope | — |

### FR-DOC — Delivery

| ID | Requirement | Acceptance criteria | Status |
|---|---|---|---|
| FR-DOC-01 | GitHub repo + setup instructions | Public repo, reproducible quick start | ✅ <https://github.com/niladri-gudu/landconnect> |
| FR-DOC-02 | Working demo/APK | Installable preview APK or hosted demo | ✅ hosted API + EAS preview APK |
| FR-DOC-03 | Demo video | 4–6 minutes, calling highlighted | ⬜ remaining deliverable |
| FR-DOC-04 | Technical documentation | Stack, architecture, decisions, challenges | ✅ this doc set |
| FR-DOC-05 | AI usage summary | Tools and contribution described | ✅ [AI_DEVELOPMENT_RULES.md](AI_DEVELOPMENT_RULES.md) + `EXPLANATION.md` |

---

## 2. Non-functional requirements

| ID | Requirement | Target | Status |
|---|---|---|---|
| NFR-01 | Type safety | `pnpm typecheck` clean across three packages | ✅ |
| NFR-02 | Shared contracts | One source for enums, schemas, DTOs | ✅ |
| NFR-03 | Secure passwords | bcrypt cost 10; never logged | ✅ |
| NFR-04 | Token hygiene | Short access TTL, hashed refresh at rest, rotation | ✅ |
| NFR-05 | Input validation | Zod at every write boundary | ✅ |
| NFR-06 | Transport security | HTTPS in deployed demo; HTTP only on LAN | ✅ `https://landconnect.hostless.app` |
| NFR-07 | Rate limiting | Abuse protection on auth/chat | ✅ per-IP limits on auth (40/15 min), conversation writes (120/min), calls (30/min) |
| NFR-08 | Automated tests | Unit + integration + E2E | ⬜ plan in [TESTING_STRATEGY.md](TESTING_STRATEGY.md) |
| NFR-09 | Accessibility | Labels/roles on interactive elements; contrast | 🟡 partial |
| NFR-10 | UI responsiveness | Feed usable on mid-range Android | ✅ by construction (FlatList, pagination) |
| NFR-11 | Observability | Structured request/call logs | ⬜ |
| NFR-12 | Documentation | Every major decision documented | ✅ |

---

## 3. Requirement → test mapping (manual for now)

| Requirement | How to verify |
|---|---|
| FR-AUTH-01/02 | Register a new buyer, log out, log back in |
| FR-AUTH-07 | Capture a refresh token, refresh once, reuse the old token, expect all sessions revoked |
| FR-ROLE-01 | Log in as buyer; attempt `POST /api/listings` with curl → 403 |
| FR-ROLE-02 | As a second seller, PATCH another seller's listing → 403 |
| FR-LIST-01/03 | Seed data appears in feed; detail shows price/area/description/location |
| FR-LIST-04 | Create listing with GPS; appears at top of feed |
| FR-MSG-01/02 | Buyer messages seller from listing; seller receives live; reply arrives live |
| FR-CALL-01..06 | Two devices: start audio, accept, speak, end; repeat video; reject a call |
| FR-PRIV-01 | Inspect conversation/call JSON; confirm no `phone` field |
| NFR-01 | `pnpm typecheck` |

Full matrix: [TESTING_STRATEGY.md](TESTING_STRATEGY.md).
