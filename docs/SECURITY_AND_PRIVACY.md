# Security and Privacy

**Baseline:** 2026-11-21
**Related:** [AUTH_AND_ROLE_PERMISSIONS.md](AUTH_AND_ROLE_PERMISSIONS.md) · [API_SPEC.md](API_SPEC.md) · [KNOWN_ISSUES.md](KNOWN_ISSUES.md)

---

## 1. Assets

| Asset | Where | Sensitivity |
|---|---|---|
| Password hashes | `User.passwordHash` | High |
| Access tokens | Client secure storage; request headers | High (short-lived) |
| Refresh tokens | Client secure storage; SHA-256 in DB | High (long-lived) |
| Phone numbers | `User.phone` | High (PII) |
| User identity and email | `User` | Medium |
| Listing details and exact coordinates | `Listing` | Medium–High (physical safety) |
| Chat messages | `Message` | Medium–High |
| Call metadata | `CallSession` | Medium |
| JWT secret, DB URL, LiveKit secret | Environment | Critical |

## 2. Threat model (prototype)

| Threat | Vector | Control today | Residual risk |
|---|---|---|---|
| Credential stuffing | Login endpoint | bcrypt + generic errors | No rate limit/lockout (KI-08) |
| Password theft from DB | DB leak | bcrypt cost 10 | Offline cracking possible if weak passwords |
| Access-token theft | Device compromise, logs | 15m TTL; no logging of headers | Valid until expiry |
| Refresh-token theft | DB leak | Only SHA-256 stored; rotation | Reuse detection revokes family |
| Token replay after rotation | Client race | Atomic claim + single-flight client | Covered |
| Privilege escalation | Buyer calls write APIs | `requireRole` server-side | Covered |
| Horizontal access (IDOR) | Guessing listing/conversation/call ids | Ownership/membership checks; UUIDs | Covered; no enumeration |
| Eavesdropping in transit | Network | HTTPS/WSS in deployment | Dev HTTP on LAN is plaintext |
| Contact harvesting | Listing pages | No phone/email in public DTOs | Covered |
| Spam listings / messages | Open registration | Zod limits | No moderation or rate limits |
| Malicious file upload | Images today are URLs | Only URL strings accepted | Upload pipeline must validate type/size |
| SSRF via image URL | Server fetching images | Server never fetches images | Future upload handlers must avoid SSRF |
| Socket impersonation | Forged handshake | JWT verified at handshake | Covered |
| Room eavesdropping | Joining another conversation | Membership check before join | Covered |
| Call hijacking | Requesting another call token | Participant check + ACTIVE state | Covered |
| XSS (web build) | User content | React escapes by default; no HTML render | Low |
| CSRF | Cookie flows | Tokens in headers, not cookies | Not applicable |
| Secret leakage | Git | `.env` ignored; `.env.example` only | Ensure no secret ever committed |
| PII in logs | Error logging | Only unhandled errors logged; no request bodies | Review before production |

## 3. Implemented controls

### 3.1 Authentication
- bcrypt, cost 10; passwords never logged or returned.
- Generic login failure message (no account enumeration).
- Access JWT with `typ: "access"` and 15-minute TTL.
- Opaque refresh tokens, SHA-256 hashed at rest, rotation with atomic claim.
- Refresh-token reuse revokes every active session for the user.
- Logout revokes the presented refresh token.

### 3.2 Authorization
- Role is embedded in the access token and re-checked by `requireRole`.
- Listing mutations require the correct role **and** ownership.
- Conversation reads/writes require `ConversationParticipant` membership.
- Call get/token/end require initiator or receiver; answer is receiver-only.
- Realtime conversation joins are membership-checked server-side.
- Realtime relay events are accepted only from sockets already in the room.

### 3.3 Input handling
- Zod validation on every write boundary (auth, listings, messages, calls).
- Bounds on string lengths, numeric ranges, array sizes, coordinate ranges.
- Pagination caps (`pageSize ≤ 50`), message history cap (200).
- JSON body limit 2 MB.
- Parameterised queries via Prisma (no raw SQL).
- Central error handler does not echo stack traces to clients.

### 3.4 Transport and platform
- `helmet()` security headers on all responses.
- CORS configurable; default `*` for local development.
- Client tokens in `expo-secure-store` (Keychain/Keystore) on device.
- Android permissions declared explicitly (location, record audio; camera pending).
- No third-party analytics or tracking SDKs.

### 3.5 Privacy by design
- Phone number is optional and never part of public DTOs.
- Listing owners are shown by name/role/avatar only.
- Calls are in-app; no dialler or external number is exposed.
- Call/message content stays in the app database; no external logging.
- Exact coordinates are public on listings by necessity; consider fuzzing for production
  (see §5).

## 4. Privacy decisions and user-facing copy

| Decision | Rationale | Copy in app |
|---|---|---|
| Phone optional | Many users will not want to share it; calls do not need it | "Phone (optional, never shown publicly)" |
| No phone in DTOs | Prevent scraping and off-platform contact | "Contact stays inside the app" |
| Profile privacy card | Make the promise visible | "Your phone number is never shared…" |
| No contact links | Keep transaction inside the product | Phone call/video buttons only |
| Message retention | Needed for conversation history | Not disclosed yet — add a privacy note |

## 5. Location privacy

Exact coordinates identify a plot, which is the product's purpose, but they can also identify a
home or a person. For this prototype, exact coordinates are public to authenticated and
anonymous feed readers.

Recommended for production:
- Show an approximate pin (e.g. 200–500 m offset) in the public feed.
- Reveal exact coordinates only after a conversation starts or on owner approval.
- Provide a "hide exact location" toggle per listing.
- Log who views exact coordinates.
- Never expose the owner's *current device* location, only the listing location.

## 6. Secrets and configuration

| Secret | Must be | Never |
|---|---|---|
| `JWT_SECRET` | Long random string; deployed as a secret | Committed, logged, reused across environments |
| `DATABASE_URL` / `DIRECT_URL` | Environment secret | Committed, screenshotted, sent in chat |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Server secret; tokens minted server-side | Put in the mobile bundle |
| Cloudinary API secret | Server secret (or unsigned preset with restrictions) | Hardcoded in the app |
| `EXPO_PUBLIC_*` | Public by definition | Use for secrets |

Rules:
- `.env` and `.env.*` are gitignored; only `.env.example` is committed.
- The API warns loudly when the development JWT fallback is active.
- Rotate any secret that appears in a recording, screenshot or chat.
- EAS builds receive `EXPO_PUBLIC_API_URL` per profile, not secrets.

## 7. Deployment hardening checklist

- [ ] HTTPS/WSS only; redirect HTTP.
- [ ] Strong, unique `JWT_SECRET` per environment.
- [ ] `CORS_ORIGIN` allowlist instead of `*`.
- [ ] Rate limiting on auth, messages, calls and listing creation.
- [ ] Request logging with PII redaction.
- [ ] Error monitoring (Sentry) with scrubbing.
- [ ] Database backups and connection limits.
- [ ] Dependency audit (`pnpm audit`) in CI.
- [ ] LiveKit API secret restricted to token minting.
- [ ] Cloudinary upload preset limited by type/size and signed.
- [ ] Security headers verified (helmet defaults plus HSTS at the proxy).
- [ ] Socket.IO origin allowlist.

## 8. Prototype-specific residual risks

| Risk | Severity | Mitigation before submission |
|---|---|---|
| No rate limiting | Medium | Add `express-rate-limit` or document as known gap |
| Access tokens valid until expiry after logout | Low | Documented; 15m TTL |
| Dev JWT fallback | High if deployed | Fail fast in production if unset |
| HTTP on LAN during demo | Medium | Demo video can use deployed HTTPS API |
| Exact coordinates public | Medium | Documented design trade-off |
| No moderation | Low for demo | Seed/demo data only |
| Refresh-token rows never pruned | Low | Add cleanup job if time permits |
| Web build stores tokens in localStorage | Medium | Mobile is the evaluated target |

## 9. Incident response (prototype)

1. Rotate `JWT_SECRET`, `DATABASE_URL` credentials, LiveKit keys and Cloudinary keys.
2. Revoke all refresh tokens (`UPDATE "RefreshToken" SET "revokedAt" = now()`).
3. Force sign-out in the app by clearing stored sessions.
4. Inspect access logs for abuse (once logging exists).
5. Patch the root cause and redeploy.
