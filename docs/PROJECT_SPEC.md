# Project Specification — LandConnect

**Document owner:** Niladri Gudu
**Assignment issued:** 2026-11-20
**Deadline:** 2026-11-25, 23:59 IST
**Spec baseline:** 2026-11-21
**Implementation:** this repository

---

## 1. Background

LandConnect is a hiring assignment requesting a **functional prototype** of a real-estate land
marketplace mobile application. The product connects buyers, sellers and brokers in one app:
discover plots, publish and manage listings, chat, and talk over in-app audio/video calls
without revealing personal phone numbers.

The brief explicitly says a production-ready application is **not** expected. Priority is
given to a working demonstration of the core flows, with special weight on **in-app audio and
video calling**.

## 2. Objective

Deliver a working mobile prototype with a clean, intuitive, WhatsApp-inspired interface that
demonstrates:

1. Secure authentication with three roles.
2. A community feed of land listings with images, price, description and location.
3. Seller/broker listing creation and management, including geotagged locations.
4. Map-based property location display.
5. In-app messaging and simple meeting rooms.
6. **In-app audio and video calling** — initiate, receive, accept, reject, end — with no phone
   number sharing.
7. Role-based permissions and basic privacy controls.

## 3. Personas and jobs to be done

| Persona | Primary jobs | Key screens |
|---|---|---|
| **Buyer** | Browse land, search by city/price, inspect details and location, message or call the lister | Community feed, listing detail, chat, call |
| **Seller** | Publish plots with photos, price, size and exact location; manage and remove listings; respond to buyers | My Listings, create listing, chat, call |
| **Broker** | Same as seller, typically representing multiple owners; may act as intermediary | My Listings, create listing, chat, call |

All roles can browse, chat and call. Only sellers and brokers can create listings.

## 4. Functional scope

### 4.1 Authentication and roles
- Email + password registration and login.
- Three roles selected at registration: `BUYER`, `SELLER`, `BROKER`.
- Access is role-based on the server and reflected cosmetically in the UI.
- Sessions survive app restarts via secure storage and transparent token refresh.

### 4.2 Community and listings
- Feed of active listings, newest first, with search across title/description/city.
- Cards show cover image (or fallback), title, INR price, acreage, city/state.
- Detail screen shows description, price, area, owner identity (name/role), and location.
- Filters supported by the API: city, keyword, min/max price, pagination.

### 4.3 Listing management
- Sellers/brokers create listings with title, description, price, area, address, city, state,
  country, latitude/longitude and image URLs.
- Owners can update (API) and delete (UI + API) their own listings.
- Ownership is re-checked server-side on every mutation.

### 4.4 Maps and geolocation
- Listings carry precise coordinates.
- Create flow captures GPS via `expo-location` or accepts manual coordinates.
- Detail flow exposes the location via an OpenStreetMap deep link today.
- Target: embedded MapLibre map with marker and location picker (see
  [MAPS_AND_GEOLOCATION.md](MAPS_AND_GEOLOCATION.md)).

### 4.5 Messaging and meeting rooms
- Buyers start a conversation from a listing; conversations are idempotent per
  (listing, buyer, owner).
- Text messages persist and are delivered live over Socket.IO to open chats.
- "Meeting rooms" are implemented as persistent conversation rooms joined over Socket.IO; the
  call room name derives from the call session.

### 4.6 Audio and video calling (key requirement)
- Initiate audio or video call from a listing or a chat.
- Receiver can accept or reject.
- Both sides can end an active call.
- Caller sees calling/connected/ended states; receiver sees an incoming call state.
- No phone numbers are used or displayed for calling.
- Server assigns a unique room; LiveKit room tokens are issued when configured.
- **Current gap:** real media tracks are not published/subscribed yet. Closing this gap is the
  top priority in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

### 4.7 Privacy and access control
- Phone numbers are stored optionally but never included in listing, conversation or call DTOs.
- Conversations and calls are restricted to participants.
- Listing mutations are restricted to the owner with the right role.
- Free-text listing fields are user content; moderation is out of scope.

## 5. Non-functional expectations

| Area | Expectation for a prototype |
|---|---|
| Usability | WhatsApp-like familiarity, minimal taps to message/call, clear states |
| Reliability | Flows work repeatedly on a physical Android device and at least one other client |
| Performance | Feed renders promptly on 3G/4G; 12–25 items per page |
| Security | No plaintext passwords, no leaked phone numbers, role checks server-side |
| Maintainability | TypeScript strict, shared contracts, small route modules, documented decisions |
| Portability | Android APK for evaluation; iOS kept buildable |
| Explainability | Every architectural decision documented and defensible in interview |

## 6. Out of scope (prototype)

Payments, escrow, title verification, legal documents, KYC, mortgage calculators, advanced
analytics, admin console, email verification/password reset, push notifications, scheduled
meeting rooms with calendars, chat attachments beyond text, blocking/reporting, multi-language,
offline mode.

## 7. Deliverables

1. Public GitHub repository with setup/run instructions.
2. Working demo — APK and/or hosted API + Expo link.
3. Short demonstration video highlighting calling.
4. Technical documentation: stack, architecture, decisions, approach, challenges.
5. AI tools usage summary.
6. Reply to the assignment email with all links.

Detailed plan: [DEMO_AND_SUBMISSION.md](DEMO_AND_SUBMISSION.md).

## 8. Evaluation criteria → how this repo responds

| Criterion | Response |
|---|---|
| Functional completeness and reliability | Requirement tracking in [REQUIREMENTS.md](REQUIREMENTS.md); manual QA matrix in [TESTING_STRATEGY.md](TESTING_STRATEGY.md) |
| Technical understanding | [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [API_SPEC.md](API_SPEC.md), [EXPLANATION.md](EXPLANATION.md) |
| Problem-solving | Token rotation/reuse detection, idempotent conversations, LiveKit-with-P2P-fallback design, documented risks |
| Code organisation | Turborepo monorepo, shared Zod contracts, thin routes, typed DTOs, [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md) |
| UI/UX | WhatsApp-inspired design system, [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md), [SCREEN_FLOW.md](SCREEN_FLOW.md) |
| Audio/video calling | [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) — lifecycle done, media is the final build step |

## 9. Assumptions

- Evaluators will run the Android build or watch the demo video.
- A free Neon database is acceptable; no paid services are required for the core demo.
- LiveKit Cloud (free tier) or a locally hosted LiveKit server may be used for media.
- Seed accounts are demo credentials, not production secrets.
- Expo Go cannot host native WebRTC modules; a development/preview build is required for real
  calling.

## 10. Success definition

The submission is successful when an evaluator can, in under five minutes:

1. Log in as a buyer and as a seller on two clients.
2. See the seller's listing in the community feed.
3. Open the listing, message the seller, and receive the message live.
4. Start an audio call and a video call; the seller accepts, both sides see/hear each other,
   and either side can end the call.
5. Confirm no phone number is visible anywhere in the flow.
