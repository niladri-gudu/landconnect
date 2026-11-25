# Known Issues and Limitations

**Baseline:** 2026-11-21
**Legend:** P0 blocks submission · P1 materially affects evaluation · P2 polish · P3 out of scope
**Related:** [TASK_TRACKER.md](TASK_TRACKER.md) · [TESTING_STRATEGY.md](TESTING_STRATEGY.md)

This file is deliberately honest. A prototype is judged on what works and on whether the author
understands what does not.

---

## P0 — must fix before submission

### KI-01 — No real call media
**Severity:** P0 · **Area:** Calling
**Symptom:** The call screen renders ringing/active states and receives LiveKit tokens, but never
creates an `RTCPeerConnection` or joins a LiveKit room. No audio or video flows.
**Impact:** The key evaluation criterion is unmet.
**Fix:** Integrate LiveKit RN or `react-native-webrtc`; publish local tracks and render remote
tracks. See [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) §4–5.
**Status:** Resolved 2026-11-25 — audio verified 2026-11-23 (phone ↔ emulator, RTP both ways over
cellular), and a full video call was verified on the final build: remote video from the phone
rendered on the emulator, the emulator test pattern rendered on the phone, local preview and
camera toggle worked, and the call logged `Video call · 4:20` in chat. Video was also verified
between two physical devices; see `docs/screenshots/video-call-devices.jpeg`.

### KI-02 — No incoming-call UI outside the call screen
**Severity:** P0 · **Area:** Calling
**Symptom:** `call:incoming` is emitted and can reach the receiver's `user:<id>` room, but only
`call/[callId].tsx` listens. A receiver on the feed or messages tab sees nothing.
**Impact:** Demos look broken unless the receiver happens to be on a call route.
**Fix:** Connect the socket at app level after auth; on `call:incoming` where
`receiverId === me`, show an overlay or navigate to `/call/<id>`.
**Status:** Resolved 2026-11-22 — `components/incoming-call.tsx` is mounted in the root layout and
shows accept/decline on any screen.

### KI-03 — Camera/microphone permissions incomplete
**Severity:** P0 · **Area:** Mobile config
**Symptom:** Android declares `RECORD_AUDIO` but not `CAMERA`; iOS has no
`NSCameraUsageDescription`/`NSMicrophoneUsageDescription`.
**Impact:** Video calls fail or crash on permission request.
**Fix:** Add permissions and usage strings, rebuild the dev client, request at runtime with a
rationale. See [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) §4.2.
**Status:** Resolved 2026-11-23 — permissions and usage strings are present, and
`lib/call-permissions.ts` now requests `RECORD_AUDIO` (plus `CAMERA` for video) before creating,
accepting, or joining a call. Denial shows an actionable error with Settings/retry actions instead
of joining a muted room.

### KI-09 — No demo build or deployed API
**Severity:** P0 · **Area:** Delivery
**Symptom:** No preview APK, no hosted API, no public git remote.
**Impact:** Evaluators cannot run the app.
**Fix:** Deploy API (Render/Fly/Railway), build a preview APK with EAS, push a public repo.
**Status:** Resolved 2026-11-24 — API live at <https://landconnect.hostless.app>, repository
public at <https://github.com/niladri-gudu/landconnect>, preview APK published from EAS.

---

## P1 — materially affects evaluation

### KI-26 — Rooms not re-joined after socket reconnect
**Severity:** P1 · **Area:** Realtime
**Symptom:** Socket.IO rooms are lost on disconnect. The chat effect joins once; after a network
blip, new messages stop arriving until the screen remounts.
**Fix:** On `socket.on('connect')`, re-emit `conversation:join` for the active conversation, or
move the join into the connect handler.
**Status:** Resolved 2026-11-22 — `lib/socket.ts` keeps a joined-conversation registry and
re-emits on every `connect`, with token refresh on auth failures and polling fallback.

### KI-04 — Map is a deep link, not embedded
**Severity:** P1 · **Area:** Maps
**Symptom:** Listing detail shows a card that opens OpenStreetMap in a browser.
**Impact:** The "integrate map functionality" requirement is only partially demonstrated.
**Fix:** MapLibre RN + OpenFreeMap in a dev build; keep the deep link as fallback.
**Status:** Resolved 2026-11-23 — `components/listing-map.tsx` renders the embedded map and the
create-screen picker; verified on the rebuilt Android development client (detail map at the
listing pin, picker tap rewrites the coordinates). The schematic card remains the fallback when
the native module is absent.

### KI-05 — Images were pasted URLs
**Severity:** P1 · **Area:** Listings
**Symptom:** `expo-image-picker` was unused; sellers pasted comma-separated URLs.
**Impact:** Poor real-world usability; the image-upload requirement was partial.
**Fix:** Picker → `POST /api/uploads` → Neon Object Storage (Files SDK) → store public URLs.
**Status:** Resolved 2026-11-23 — the create form uploads up to four JPEG/PNG/WebP photos
(≤8 MB each) to the `uploads` bucket and saves the returned URLs in `listing.images`. Verified
from the emulator (`POST /api/uploads` 201) and with direct API checks (415/403/413 guards).

### KI-06 — No listing edit screen
**Severity:** P1 · **Area:** Listings
**Symptom:** `PATCH /api/listings/:id` works, but there is no UI to call it.
**Fix:** Reuse the create form with initial values and a PATCH submit.
**Status:** Resolved 2026-11-24 — My Listings and the owner card on listing detail open the form
with `?id=`, which prefills every field, keeps or removes saved photos, uploads new ones, and
PATCHes the listing.

### KI-07 — No automated tests or CI
**Severity:** P1 · **Area:** Quality
**Symptom:** Verification is manual plus `pnpm typecheck`.
**Fix:** Vitest + supertest for auth/roles/calls; a typecheck workflow. See
[TESTING_STRATEGY.md](TESTING_STRATEGY.md).

### KI-08 — No rate limiting
**Severity:** P1 · **Area:** Security
**Symptom:** Login, message and call endpoints accept unlimited requests.
**Impact:** Brute force, spam ringing, message flooding.
**Fix:** `express-rate-limit` per IP and per user; stricter limits on auth and call creation.
**Status:** Resolved 2026-11-24 — per-IP limits: auth 40/15 min, conversation writes
120/min, calls 30/min, with `trust proxy` set for the hosted deployment.

### KI-21 — Permissive CORS and dev JWT fallback
**Severity:** P1 if deployed · **Area:** Security
**Symptom:** `CORS_ORIGIN` defaults to `*`; `JWT_SECRET` falls back to a known dev string with a
startup warning.
**Fix:** Set a real secret and allowlist in production; consider refusing to boot with the
fallback when `NODE_ENV=production`.
**Status:** Resolved 2026-11-24 — the API refuses to start with the default secret when
`NODE_ENV=production`, and logs a warning if `CORS_ORIGIN` is still `*`.

---

## P2 — polish and robustness

### KI-10 — Message history returns the oldest 200
**Severity:** P2 · **Area:** Messaging
**Symptom:** `orderBy createdAt asc` + `take 200` returns the earliest 200 messages, so long
conversations lose their newest history.
**Fix:** Fetch `desc` + `take`, then reverse, or implement cursor pagination.
**Status:** Resolved 2026-11-24 — the newest 200 are fetched and returned oldest-first.

### KI-11 — No missed-call transition
**Severity:** P2 · **Area:** Calling
**Symptom:** `MISSED` exists in the enum but nothing sets it; an unanswered call stays `RINGING`.
**Fix:** A timeout job or a client timer that calls `end` after 30–45 s.
**Status:** Mitigated 2026-11-23 — the caller screen ends an unanswered call after 45 s and shows
"No answer". The server records `ENDED`, not `MISSED`; a background job would be needed for the
exact enum state and is out of prototype scope.

### KI-12 — No push/background delivery
**Severity:** P2 · **Area:** Calling/Messaging
**Symptom:** Incoming calls and messages require the app to be open with a live socket.
**Impact:** Acceptable for a foreground demo; documented as a limitation.
**Fix:** FCM/APNs + call kit/VoIP push (out of prototype scope).
**Status:** Partially mitigated 2026-11-24 — while the app is foregrounded there is now an
in-app message banner and an unread tab badge; a ring or message that occurred during a socket
gap is recovered on reconnect/foreground (pending-ring replay + history refetch). Verified
2026-11-25: a call created while the phone was offline/restarted rang on return, and a message
sent while the phone was backgrounded arrived once foregrounded. If the app stays foregrounded
through a network blip, the automatic socket reconnect can lag until the next foreground cycle;
true background delivery still needs push and remains out of scope.

### KI-13 — Refresh-token rows are never pruned
**Severity:** P2 · **Area:** Backend
**Symptom:** Expired/revoked rows accumulate.
**Fix:** A scheduled delete of rows past `expiresAt` (and old revoked rows).

### KI-22 — P2P relay has no client implementation
**Severity:** P2 · **Area:** Calling
**Symptom:** The server relays `webrtc:*`, but no client emits or consumes them.
**Fix:** Either implement the raw WebRTC path or remove the fallback claim from the architecture
once LiveKit is the shipped path.

### KI-23 — Call UI lacks counterpart identity
**Severity:** P2 · **Area:** Calling/UX
**Symptom:** Call screen shows hardcoded "R"/"C" initials and no name.
**Fix:** Include participant names in the call DTO or fetch the conversation, then render them.
**Status:** Resolved 2026-11-23 — `CallDto` now embeds `initiator` and `receiver` summaries
(`id`, `name`, `role`, `avatarUrl`). The ring overlay and both call stages render the correct
name and role immediately, with no second fetch.

### KI-24 — No deep-link handling for calls
**Severity:** P2 · **Area:** Navigation
**Symptom:** Scheme `landconnect://call/<id>` is routable but nothing navigates to it from a
notification or external link.
**Fix:** Wire `expo-linking` to the call route; useful once push exists.

### KI-27 — Second-call/busy behaviour undefined
**Severity:** P2 · **Area:** Calling
**Symptom:** A user can start a second call while already in one; no busy state.
**Fix:** Reject new calls when an active call exists, or show a "call waiting" flow.
**Status:** Resolved 2026-11-24 — `POST /api/calls` returns 409 while either participant has an
ACTIVE call (or a RINGING one under two minutes old); the app surfaces the message.

### KI-28 — Call duration not displayed or stored
**Severity:** P2 · **Area:** Calling
**Symptom:** `startedAt`/`endedAt` exist; the UI shows no duration.
**Fix:** Compute on end and show a summary in the chat (`type: CALL` message, already modelled).
**Status:** Resolved 2026-11-24 — the active call shows a live timer, and each call now writes a
`CALL` message into the conversation ("Audio call · 2:14", "Missed audio call", "Declined video
call"), so history lives in chat without a separate screen.

---

## P3 — out of scope for the prototype

### KI-14 — No email verification or password reset
Registration accepts any email. Password reset requires email infrastructure.

### KI-15 — No block/report
Users cannot block or report each other. Relevant for a public marketplace.

### KI-16 — No content moderation
Listing text and images are not reviewed. Acceptable with seed/demo data.

### KI-17 — `images` is a Postgres array
`String[]` works but is not portable and cannot store ordering metadata. A join table is the
production shape.

### KI-18 — No optimistic sends, read receipts, presence or typing UI
Messaging is functional but basic. Typing events are server-ready only.

### KI-19 — Web build stores tokens in localStorage
The evaluated target is mobile (SecureStore). Web is a convenience fallback and is more exposed
to XSS.

### KI-20 — No structured logging/metrics
Only `console` logs for startup and unhandled errors. Add request IDs, redaction and metrics
before production.

### KI-25 — Seed listings have no images
**Status:** Resolved — seed listings carry curated Unsplash photography (illustrative, not the
real plots).

---

## Quick status summary

| ID | Area | Severity | Status |
|---|---|---|---|
| KI-01 | Calling media | P0 | Audio verified; video implemented, final check pending |
| KI-02 | Incoming call UI | P0 | Resolved |
| KI-03 | Permissions | P0 | Resolved |
| KI-09 | Build/deploy | P0 | Resolved (hosted API + APK + repo) |
| KI-26 | Socket rejoin | P1 | Resolved |
| KI-04 | Embedded map | P1 | Resolved |
| KI-05 | Image upload | P1 | Resolved |
| KI-06 | Edit listing | P1 | Resolved |
| KI-07 | Tests/CI | P1 | Open |
| KI-08 | Rate limiting | P1 | Resolved |
| KI-21 | CORS/dev secret | P1 if deployed | Resolved (production guard) |
| KI-11 | Missed-call transition | P2 | Mitigated (client timer) |
| KI-23 | Counterpart identity | P2 | Resolved |
| KI-10, 27 | Messaging/calls robustness | P2 | Resolved |
| KI-28 | Call history | P2 | Resolved |
| KI-12–13, 22, 24 | Messaging/calls polish | P2 | Open (KI-12 partially mitigated) |
| KI-14–20 | Product polish | P3 | Deferred |
| KI-25 | Seed images | P3 | Resolved |
