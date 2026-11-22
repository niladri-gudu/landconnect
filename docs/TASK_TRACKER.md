# Task Tracker

**Baseline:** 2026-11-21
**Deadline:** 2026-11-25 23:59 IST
**Legend:** ✅ done · 🔄 in progress · ⬜ todo · ⛔ blocked · 💤 deferred
**Related:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) · [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

---

## 1. Completed (repository baseline)

### Foundation
- ✅ Turborepo + pnpm workspaces (`apps/api`, `apps/mobile`, `packages/shared`)
- ✅ TypeScript strict base config and per-package tsconfigs
- ✅ Shared enums, socket event names, Zod schemas, DTO types
- ✅ Expo SDK 58 app with Expo Router, typed routes, React Compiler
- ✅ Metro monorepo config
- ✅ EAS configs (development / preview APK / production)

### Auth
- ✅ Register with role selection
- ✅ Login
- ✅ bcrypt password hashing
- ✅ 15-minute access JWT
- ✅ 30-day opaque refresh token, SHA-256 hashed at rest
- ✅ Refresh rotation with atomic claim
- ✅ Reuse detection revokes all sessions
- ✅ Logout revocation
- ✅ `/auth/me` session restore
- ✅ Secure storage (SecureStore / localStorage web)
- ✅ Single-flight refresh on 401 + retry
- ✅ Socket handshake authentication with latest token

### Roles and permissions
- ✅ `requireAuth` / `requireRole` guards
- ✅ Listing ownership checks
- ✅ Conversation membership checks
- ✅ Call participant checks; receiver-only answer
- ✅ Buyer UI gate on My Listings

### Listings
- ✅ Prisma `Listing` model with coordinates, images, status
- ✅ Feed with keyword/city/price filters and pagination
- ✅ My listings
- ✅ Listing detail
- ✅ Create listing with local + server validation
- ✅ GPS capture via expo-location
- ✅ Delete listing
- ✅ `PATCH` API for updates
- ✅ Seed users + 3 listings

### Messaging
- ✅ Conversation model + participants
- ✅ Idempotent conversation creation per listing+buyer+owner
- ✅ Conversation list with last message
- ✅ Message history
- ✅ Send message with persistence
- ✅ Realtime `message:new` fan-out
- ✅ Chat screen with bubbles and composer
- ✅ Typing and WebRTC relay events server-side

### Calling
- ✅ `CallSession` model and statuses
- ✅ Create call + unique room name
- ✅ Incoming event to user room and conversation room
- ✅ Accept/reject endpoint and events
- ✅ End endpoint and event
- ✅ LiveKit token endpoint (server)
- ✅ Call UI states: ringing, active, rejected, ended
- ✅ Mute/camera toggles (UI only)
- ❌ Real media tracks (the critical gap)

### Calling media & realtime reliability (Phase 1–2 — 2026-11-22)
- ✅ `expo-dev-client` + LiveKit RN (`@livekit/react-native`, webrtc, `livekit-client`) installed
- ✅ Expo config plugins registered; `CAMERA`, `RECORD_AUDIO`, `BLUETOOTH_CONNECT`, iOS usage strings
- ✅ `LiveKitRoom` joins with a server token; publishes mic (+ camera for video); renders remote video
- ✅ Mute/camera buttons control real tracks via `useLocalParticipant`
- ✅ Global `IncomingCallHost` accepts/declines from any screen; call events fan out to user rooms
- ✅ One app-level socket: reconnects, rejoins conversation rooms, refreshes token on auth error
- ✅ Optimistic chat bubbles (`Sending…` / `Tap to retry`), merged history, live Messages tab
- ⬜ Two-device media verification — needs EAS development build + LiveKit credentials

### Performance & reliability (Phase 0 — 2026-11-22)
- ✅ Per-request latency logging (`[api] METHOD path status Nms`, slow > 500 ms)
- ✅ `GET /health/db` runs `SELECT 1` and reports latency; distinguishes DB cold start from API health
- ✅ Database warmed on boot (measured 2.4 s cold → 145 ms warm)
- ✅ Keep-warm ping every 4 minutes (`DB_KEEPWARM_MS`, default 240000, 0 disables)
- ✅ 15 s request timeout with actionable message in mobile `api.ts`
- ✅ Refresh-token fetch timeout (prevents a hung 401 retry chain)
- ✅ Non-JSON/HTML error responses surface a short message instead of a raw `SyntaxError`
- ✅ Mobile warns when `EXPO_PUBLIC_API_URL` is localhost (physical devices cannot reach it)
- ✅ Gzip for JSON responses > 1 KB via built-in `zlib` (2104 → 873 bytes measured)
- ✅ Startup warnings for missing `pgbouncer=true` / `connection_limit` on a pooled Neon URL

### Docs
- ✅ README + full documentation set
- ✅ EXPLANATION build narrative

---

## 2. P0 — must finish before submission

| # | Task | Area | Est. | Status | Notes |
|---|---|---|---|---|---|
| P0-1 | Add camera/mic/Bluetooth permissions + iOS usage strings | Mobile config | 30 m | ✅ | `app.json` |
| P0-2 | Install `expo-dev-client` and build a development client | Build | 1 h + queue | 🟡 | Packages + config done; EAS build pending login |
| P0-3 | Integrate LiveKit RN (or raw WebRTC) and publish/play tracks | Calling | 5 h | 🟡 | Code done; needs LiveKit env + device test |
| P0-4 | Wire mute/camera buttons to real tracks | Calling | 45 m | ✅ | `components/active-call.tsx` |
| P0-5 | Global incoming-call listener + overlay/route | Calling | 2 h | ✅ | `components/incoming-call.tsx` |
| P0-6 | Socket lifecycle at app level (connect after auth) | Realtime | 45 m | ✅ | `lib/auth.tsx` + `lib/socket.ts` |
| P0-7 | Re-join conversation rooms on socket reconnect | Realtime | 30 m | ✅ | `lib/socket.ts` registry |
| P0-8 | Two-device audio call passes | QA | 1 h | ⬜ | Test matrix C1 |
| P0-9 | Two-device video call passes | QA | 1 h | ⬜ | C2 |
| P0-10 | Accept/reject/end/cancel pass on both sides | QA | 1 h | ⬜ | C4–C6 |
| P0-11 | Build preview APK | Build | 1 h + queue | ⬜ | `eas build --profile preview` |
| P0-12 | Public GitHub repo with clean secrets | Delivery | 1 h | ⬜ | No remote yet |
| P0-13 | Record demo video (calling first) | Delivery | 2 h | ⬜ | Script in DEMO doc |
| P0-14 | Send submission email | Delivery | 30 m | ⬜ | Before Nov 24 EOD |

---

## 3. P1 — do if calling is stable

| # | Task | Area | Est. | Status |
|---|---|---|---|---|
| P1-1 | Deploy API (Render/Fly/Railway) + Neon + LiveKit env | Delivery | 2 h | ⬜ |
| P1-2 | Point preview APK at deployed HTTPS API | Delivery | 20 m | ⬜ |
| P1-3 | MapLibre embedded map on listing detail | Maps | 3 h | ⬜ |
| P1-4 | Tap-to-pick location on create | Maps | 1 h | ⬜ |
| P1-5 | Image picker + Cloudinary upload | Listings | 2 h | ⬜ |
| P1-6 | Listing edit screen using PATCH | Listings | 1.5 h | ⬜ |
| P1-7 | Rate limiting on auth/messages/calls | Security | 1 h | ⬜ |
| P1-8 | Add `MISSED` timeout (client or job) | Calling | 1 h | ⬜ |
| P1-9 | Handle permission-denied flows gracefully | Calling | 45 m | ⬜ |
| P1-10 | Show counterpart name in call UI | Calling | 45 m | ⬜ |
| P1-11 | API smoke tests (Vitest + supertest) | Testing | 2 h | ⬜ |
| P1-12 | Typecheck CI on push | Testing | 30 m | ⬜ |
| P1-13 | Verify no phone/email leaks in DTOs | Security | 30 m | ⬜ |

---

## 4. P2 — only if time remains

| # | Task | Area | Status |
|---|---|---|---|
| P2-1 | Typing indicator client wiring | Messaging | ⬜ |
| P2-2 | Message pagination / newest-200 fix | Messaging | ⬜ |
| P2-3 | Read receipts | Messaging | 💤 |
| P2-4 | Skeletons instead of "Loading…" | UX | ⬜ |
| P2-5 | City/price filter sheet | Listings | ⬜ |
| P2-6 | Listing status controls (mark sold/archive) | Listings | ⬜ |
| P2-7 | Refresh-token cleanup job | Backend | ⬜ |
| P2-8 | Structured request logging | Backend | ✅ | Phase 0 timing middleware |
| P2-9 | Call duration display | Calling | ⬜ |
| P2-10 | Haptics/ringtone on incoming call | Calling | ⬜ |

---

## 5. Submission checklist

### Repository
- [ ] `git init` history has meaningful commits
- [ ] Remote created and pushed (public)
- [ ] `.env` and secrets not tracked (`git status`, `git log -p | grep -i secret`)
- [ ] README setup works from a fresh clone
- [ ] Docs links resolve
- [x] `pnpm typecheck` passes (verified 2026-11-22)

### Demo
- [ ] APK installs on a clean Android device
- [ ] APK points at the deployed API
- [ ] Demo accounts work
- [ ] Seed data visible
- [ ] Calling works on the demo network
- [ ] Video is uploaded and link is public

### Documentation
- [ ] Architecture, stack, decisions, challenges explained
- [ ] AI usage summary written
- [ ] Known issues honest and current
- [ ] Demo script followed
- [ ] Contact details correct in the submission email

### Submission
- [ ] GitHub link
- [ ] APK / demo link
- [ ] Video link
- [ ] Documentation link (repo or doc)
- [ ] AI summary included
- [ ] Email sent and confirmed

---

## 6. Status log

| Date | Completed | Notes |
|---|---|---|
| 2026-11-20 | Scaffold, auth, listings, messaging, call signalling, docs | Baseline |
| 2026-11-21 | Full documentation set | Media still pending |
| 2026-11-22 | Phase 0 + Phase 1–2 code: timing/keep-warm, LiveKit RN + incoming host, socket lifecycle, optimistic chat | Typecheck green; two-user signalling smoke test passed; media needs dev build + LiveKit keys |
| 2026-11-23 | — | Planned: QA + APK |
| 2026-11-24 | — | Planned: video + submission |
