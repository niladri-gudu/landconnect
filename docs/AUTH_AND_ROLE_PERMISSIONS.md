# Authentication and Role Permissions

**Baseline:** 2026-11-21
**Source:** `apps/api/src/lib/security.ts`, `apps/api/src/routes/auth.ts`, `apps/mobile/src/lib/auth.tsx`, `apps/mobile/src/lib/session.ts`
**Related:** [API_SPEC.md](API_SPEC.md) · [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

---

## 1. Roles

| Role | Intent | Can list land? | Can browse? | Can chat/call? |
|---|---|---|---|---|
| `BUYER` | Discover and enquire | No | Yes | Yes |
| `SELLER` | Own and publish land | Yes | Yes | Yes |
| `BROKER` | Manage listings on behalf of owners | Yes | Yes | Yes |

The role is chosen at registration, stored on `User.role`, embedded in the access JWT, and
enforced server-side. The UI hides seller-only affordances, but that is cosmetic: every
sensitive route also checks the role and ownership.

## 2. Permission matrix

| Action | Public | Buyer | Seller | Broker | Owner required |
|---|---|---|---|---|---|
| Register / login / refresh | ✅ | — | — | — | — |
| Read feed / listing by id | ✅ | ✅ | ✅ | ✅ | — |
| Read own profile (`/auth/me`) | — | ✅ | ✅ | ✅ | self |
| Create listing | — | ❌ 403 | ✅ | ✅ | — |
| Update listing | — | ❌ 403 | ✅ | ✅ | ✅ |
| Delete listing | — | ❌ 403 | ✅ | ✅ | ✅ |
| Read own listings | — | ✅ (empty) | ✅ | ✅ | self |
| Start conversation | — | ✅ | ✅ | ✅ | listing must exist |
| Read conversation messages | — | ✅ | ✅ | ✅ | participant |
| Send message | — | ✅ | ✅ | ✅ | participant |
| Start audio/video call | — | ✅ | ✅ | ✅ | participant |
| Answer call | — | — | — | — | receiver only |
| End call | — | ✅ | ✅ | ✅ | participant |
| Request LiveKit token | — | ✅ | ✅ | ✅ | participant + ACTIVE call |

**Enforcement points**

| Guard | File | Used by |
|---|---|---|
| `requireAuth` | `lib/security.ts` | All authenticated routes |
| `requireRole('SELLER','BROKER')` | `lib/security.ts` | Listing POST/PATCH/DELETE |
| `findOwnedListing()` | `routes/listings.ts` | Listing PATCH/DELETE |
| `assertMember()` | `routes/conversations.ts` | Message read/send |
| `findCallForUser()` | `routes/calls.ts` | Call get/token/end |
| receiver check | `routes/calls.ts` | Answer only |
| membership check | `realtime.ts` | Conversation room join |
| socket JWT handshake | `realtime.ts` | All realtime events |

## 3. Registration

```
POST /api/auth/register
  → Zod validates name/email/password/role/phone
  → reject duplicate email (409)
  → bcrypt.hash(password, 10)
  → User created with role
  → issueSession():
       access  = JWT 15m { id, email, name, role, typ:'access' }
       refresh = 48 random bytes, base64url
       store SHA-256(refresh) + expiresAt (30d)
  → 201 { accessToken, refreshToken, user }
```

The phone is optional, unique, and is **not** a login identifier. It exists only as internal
profile data; no listing, conversation or call DTO exposes it.

## 4. Login

```
POST /api/auth/login
  → find user by lowercased email
  → bcrypt.compare(password, hash)
  → same failure message for unknown email and wrong password
  → issueSession() → 200 AuthResponse
```

No account lockout or rate limiting yet (KI-08). Add per-IP and per-account throttling before
any public deployment.

## 5. Token model

| Property | Access token | Refresh token |
|---|---|---|
| Format | Signed JWT (HS256) | Opaque 48-byte base64url |
| Lifetime | `JWT_EXPIRES_IN`, default 15m | `REFRESH_TOKEN_TTL_DAYS`, default 30d |
| Storage (server) | Stateless | SHA-256 hash in `RefreshToken` |
| Storage (client) | `expo-secure-store` (localStorage on web) | Same |
| Claims | `id`, `email`, `name`, `role`, `typ: "access"` | none |
| Revocable | No (short TTL) | Yes (`revokedAt`) |
| Sent as | `Authorization: Bearer` | JSON body to `/refresh` and `/logout` |

`verifyToken()` rejects any JWT whose `typ` is not `access`, so a future refresh JWT (or a token
from another purpose) cannot be used as an access token.

## 6. Refresh rotation and theft detection

`POST /api/auth/refresh`:

1. Hash the presented token and look it up.
2. Unknown hash → 401.
3. `revokedAt` already set → **reuse detected**: revoke every active token for that user and
   return 401.
4. Expired → mark revoked, 401.
5. Atomic claim:
   ```sql
   UPDATE RefreshToken
      SET revokedAt = now(), replacedByTokenHash = :next
    WHERE id = :id AND revokedAt IS NULL
   ```
   If `count = 0`, another concurrent refresh won → 401.
6. Insert the new token row and return a new access + refresh pair.

This gives:
- **Rotation** — every refresh invalidates the old token.
- **Theft detection** — replaying an old token nukes the family.
- **Concurrency safety** — only one refresh can claim a token.

The client reinforces this with a single-flight `refreshPromise`: concurrent 401s share one
refresh, so the app never races itself into a false theft alarm.

## 7. Client session lifecycle

```
app start
  → loadSession() from SecureStore/localStorage
  → if none: show login
  → subscribe auth.me() (auto-refreshes on 401)
  → user set; redirect to tabs

any API 401
  → refreshSession() (single flight)
  → retry original request once
  → failure: clearSession(), user null, login screen

signOut
  → POST /auth/logout (best effort)
  → clearSession()
  → navigate to login
```

Socket connections authenticate with a **callback** (`auth: (cb) => cb({ token })`) so each
reconnect picks up the latest access token after rotation.

## 8. Phone-number privacy

- `UserDto` includes `phone` only for the authenticated user's own profile.
- Listing owner selection: `{ id, name, role, avatarUrl }` — no email, no phone.
- Conversation participants: same summary shape.
- Call DTO: user ids only, no names/contact in the payload; the call screen derives a label from
  the local call object.
- All communication is via in-app chat/call; no `tel:` or `wa.me` links exist.

## 9. Session invalidation scenarios

| Event | Access token | Refresh token |
|---|---|---|
| Logout | Expires naturally (≤15m) | Revoked immediately |
| Refresh rotation | Old access still valid until expiry | Old refresh revoked |
| Reuse detected | Valid until expiry (cannot be revoked statelessly) | All revoked |
| Password change | Not implemented | Not implemented |
| User deleted | 401 on next DB lookup for `/me`; other routes rely on cascaded data | Cascade deleted |

For a production system, add a `tokenVersion` claim or a denylist to revoke access tokens
immediately. For a prototype, the 15-minute window is acceptable and explicit.

## 10. Manual test cases

| # | Test | Expected |
|---|---|---|
| A1 | Register with duplicate email | 409, no session issued |
| A2 | Register with 7-char password | 400 with field error |
| A3 | Login wrong password | 401, same message as unknown email |
| A4 | Call `/auth/me` without token | 401 |
| A5 | Wait 15m, call `/auth/me` | Client refreshes transparently |
| A6 | Reuse an old refresh token | 401, all sessions revoked |
| A7 | Buyer POSTs a listing | 403 |
| A8 | Seller PATCHes another seller's listing | 403 |
| A9 | Non-member opens a conversation | 403 |
| A10 | Initiator tries to answer own call | 403 |
| A11 | Inspect conversation JSON | no `phone`/`email` on participants |
| A12 | Log out, relaunch app | Login screen, no cached user |

## 11. Known limitations

- No email verification or password reset.
- No MFA, device management or "sign out everywhere" UI (reuse detection is the only global
  revoke).
- Access tokens remain valid until expiry after logout.
- No login rate limiting or CAPTCHA.
- Role is immutable after registration (no upgrade/downgrade flow).
- No admin role.
