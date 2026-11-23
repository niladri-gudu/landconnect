# Screen Flow

**Baseline:** 2026-11-21
**Router:** Expo Router (file-based, typed routes)
**Related:** [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md) · [REQUIREMENTS.md](REQUIREMENTS.md)

---

## 1. Route map

| Route | File | Access | Purpose |
|---|---|---|---|
| `/` | `src/app/index.tsx` | Any | Restore session; redirect to tabs or login |
| `/(auth)/login` | `(auth)/login.tsx` | Anonymous | Email + password sign-in |
| `/(auth)/register` | `(auth)/register.tsx` | Anonymous | Create account with role |
| `/(tabs)` | `(tabs)/index.tsx` | Authenticated | Community feed (default tab) |
| `/(tabs)/listings` | `(tabs)/listings.tsx` | Authenticated | My Listings / seller gate |
| `/(tabs)/messages` | `(tabs)/messages.tsx` | Authenticated | Conversation list |
| `/(tabs)/profile` | `(tabs)/profile.tsx` | Authenticated | Identity, role, privacy, sign out |
| `/listing/[id]` | `listing/[id].tsx` | Any (API public) | Listing detail + actions |
| `/listing/create` | `listing/create.tsx` | Seller/Broker (server-enforced) | Create listing modal |
| `/chat/[conversationId]` | `chat/[conversationId].tsx` | Participant | Text chat + call actions |
| `/call/[callId]` | `call/[callId].tsx` | Participant | Ringing / active / ended call UI |

Tab icons: 🏘️ Community, 📋 My Listings, 💬 Messages, 👤 Profile.

## 2. Navigation graph

```mermaid
flowchart TD
  A[/] -->|no session| L[Login]
  A -->|session| F[Community feed]
  L -->|success| F
  L <-->|link| R[Register]
  R -->|success| F

  F --> D[Listing detail]
  F --> M[Messages]
  F --> P[Profile]
  M --> C[Chat]
  D -->|Message seller| C
  D -->|Audio / Video| K[Call screen]
  C -->|header audio / video| K
  M -->|open conversation| C
  P -->|sign out| L

  S[My Listings] -->|+ List new land| N[Create listing]
  N -->|published| D
  S -->|remove| S
```

## 3. Journeys

### 3.1 First launch and authentication

```
Open app
  → index: AuthProvider loading state
  → no stored session → /(auth)/login
  → "Create an account" → register
       choose Buyer / Seller / Broker
       optional phone labelled "never shown publicly"
  → tokens stored → /(tabs)
  → session restored on later launches → /(tabs)
```

Failure paths: inline error under the form; no navigation. Duplicate email shows the API's 409
message.

### 3.2 Buyer: discover → enquire → call

```
Community feed (active listings, search)
  → tap card → Listing detail
       cover, title, price, area, city/state
       About, Map preview, Listed by
  → if owner: "This is your listing" (no actions)
  → else:
       Message seller
         → POST /conversations (idempotent)
         → /chat/:id
       Audio / Video
         → POST /conversations then POST /calls
         → /call/:callId (caller view: "Calling…")
```

Inside chat, the header exposes the same audio/video actions.

### 3.3 Seller: publish and manage

```
My Listings tab
  → Buyer: explanatory empty state, no CTA
  → Seller/Broker:
       QA: "+ List new land" → /listing/create (modal)
       form: title, description, price, area, address, city, state,
             GPS or manual coordinates, up to 4 photos
       local Zod validation → POST /api/uploads → POST /api/listings
       → /listing/:id
       remove listing (destructive text) → DELETE → list refresh
```

Editing exists only via `PATCH /api/listings/:id`; no screen yet (KI-06).

### 3.4 Call lifecycle (target UX)

```
Caller                          Receiver
tap Audio/Video                 call:incoming on user:<id>
→ POST /api/calls               → incoming screen (global listener)
→ /call/:id "Calling…"          → Accept / Reject
                                Accept → both ACTIVE, media connects
                                Reject → caller sees rejected, returns
ACTIVE: mute, camera, end       ACTIVE: same controls
End → both return to chat/back
```

Current gap: the receiver only sees the call if the app is already on a call route; there is no
global incoming modal yet (KI-02). The server already emits to the private user room, so the
client-side fix is contained.

### 3.5 Messaging

```
Messages tab
  → list: counterpart name, "Re: listing · last message"
  → open → chat
       history loaded via GET
       socket joins conversation room
       send → POST → 201 appended locally
       incoming message:new appended if not duplicate
       header call actions
```

Conversations are created from a listing, never from a bare user search.

### 3.6 Session expiry

```
Any request → 401
  → single-flight refresh
  → success: retry once, continue silently
  → failure: clear session → login
```

### 3.7 Sign out

```
Profile → Sign out
  → POST /auth/logout (best effort)
  → clear SecureStore
  → replace route with login
```

## 4. Screen states

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Feed | "Loading…" | "No land listings yet" + guidance | (falls back to empty; add retry) |
| My Listings | "Loading…" | "No listings yet" + guidance | (add retry) |
| Messages | "Loading…" | "No conversations" + guidance | (add retry) |
| Chat | "Loading…" | blank canvas | inline send error, draft restored |
| Listing detail | "Loading…" | — | "Listing not found." |
| Call | "Loading…" | — | inline error, controls remain |
| Profile | Auth loading | — | — |

## 5. Navigation rules

- Auth and tabs layouts hide their own headers; the root stack shows branded headers.
- Create listing is presented as a modal.
- Listing detail title becomes the city.
- Chat title is "Chat"; call screen is headerless and immersive.
- `router.replace` after auth and listing creation to prevent back into stale forms.
- `router.push` for forward navigations; `router.back` after call reject/end.
- Android predictive back is disabled in `app.json`.

## 6. Deep links

Scheme: `landconnect://`. Expo Router maps paths automatically:

| Link | Destination |
|---|---|
| `landconnect://listing/<id>` | Listing detail |
| `landconnect://chat/<conversationId>` | Chat |
| `landconnect://call/<callId>` | Call screen |
| `landconnect://(auth)/login` | Login |

A push notification or incoming-call event can therefore open the call route directly. Deep-link
handling for calls is not wired yet (KI-24).

## 7. Back-stack expectations

| From | Back goes to |
|---|---|
| Listing detail | Previous tab (feed or my listings) |
| Create listing | My Listings (modal dismiss) |
| Chat | Messages or listing detail |
| Call (ringing) | Previous screen; call remains RINGING server-side until ended/timeout |
| Call (ended/rejected) | Automatic `router.back()` |
| Login/register | Root redirect prevents back into auth |

Future: when a call is cancelled or ends while the user is elsewhere, show a toast rather than
forcing navigation.

## 8. Flow gaps

1. Incoming call screen from anywhere (P0).
2. Edit-listing route (P1).
3. Image picker/upload step in create (P1).
4. Map picker route or inline map (P1).
5. Search/filter sheet for city/price (P2).
6. Conversation creation without a listing (not in scope).
7. Password reset and email verification routes (out of scope).
