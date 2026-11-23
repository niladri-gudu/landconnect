# Property Listings

**Baseline:** 2026-11-21
**Related:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [API_SPEC.md](API_SPEC.md) · [MAPS_AND_GEOLOCATION.md](MAPS_AND_GEOLOCATION.md)

---

## 1. Domain model

A **listing** is a parcel of land published by a seller or broker:

| Concept | Representation |
|---|---|
| Identity | `Listing.id` (UUID) |
| Owner | `ownerId` → `User` with role SELLER or BROKER |
| Marketing copy | `title`, `description` |
| Commercial terms | `price` (INR, Decimal), `areaAcres` |
| Place | `address`, `city`, `state`, `country` |
| Coordinates | `latitude`, `longitude` |
| Media | `images` (array of URL strings) |
| Availability | `status` ACTIVE / SOLD / ARCHIVED |
| Timestamps | `createdAt`, `updatedAt` |

One listing can have many conversations; one owner can have many listings.

## 2. Lifecycle

```
            create
              │
              ▼
        ┌──────────┐   mark sold    ┌────────┐
        │  ACTIVE  │───────────────▶│  SOLD  │
        └────┬─────┘                └────┬───┘
             │ archive                   │
             ▼                           │
        ┌──────────┐◀────────────────────┘
        │ ARCHIVED │
        └────┬─────┘
             │ delete
             ▼
        (hard delete)
```

Current UI supports create and delete. Status transitions are possible through `PATCH` but have
no screen. Public feed lists only `ACTIVE`. `GET /api/listings/:id` returns any status; the detail
screen shows a status badge when not ACTIVE.

**Delete semantics:** hard delete. Conversations are preserved with `listingId = null`
(`onDelete: SetNull`), so buyers keep chat history. Images are URLs, so nothing external is
deleted.

## 3. Field rules

| Field | Type | Required | Rules | Where enforced |
|---|---|---|---|---|
| `title` | string | ✅ | 5–120 chars, trimmed | Zod |
| `description` | string | ✅ | 20–4000 chars, trimmed | Zod |
| `price` | number | ✅ | > 0, ≤ 1e12 | Zod; Decimal(14,2) |
| `areaAcres` | number | ✅ | > 0, ≤ 1e6 | Zod; Decimal(10,2) |
| `address` | string | ✅ | 3–300 chars | Zod |
| `city` | string | ✅ | 2–100 chars | Zod |
| `state` | string | ✅ | 2–100 chars | Zod |
| `country` | string | default `India` | 2–100 chars | Zod |
| `latitude` | number | ✅ | −90..90 | Zod |
| `longitude` | number | ✅ | −180..180 | Zod |
| `images` | string[] | default `[]` | ≤ 10, each a valid URL | Zod |
| `status` | enum | default `ACTIVE` | ACTIVE/SOLD/ARCHIVED | Zod |
| `ownerId` | string | server-set | authenticated user | Route |

Client-side: `listing/create.tsx` runs `listingCreateSchema.safeParse` before the request and
shows the first issue with its field path. Price/area inputs strip commas so "25,00,000" parses.

## 4. Browse and search

`GET /api/listings`:

| Filter | Behaviour |
|---|---|
| `status` | forced `ACTIVE` |
| `q` | case-insensitive contains across title, description, city |
| `city` | case-insensitive contains |
| `minPrice` / `maxPrice` | inclusive |
| `page` / `pageSize` | 1-based; pageSize 1–50, default 12 |
| ordering | `createdAt DESC` |

The UI exposes keyword search with `pageSize: 25`; city/price filters exist server-side but have
no controls yet. The query uses a transaction to return items and total together.

**Future:** PostGIS radius search, price-per-acre sorting, saved searches, "near me".

## 5. Create flow

```
My Listings → + List new land
  title
  description
  price (₹) | area (acres)
  address
  city | state
  location box:
    latitude | longitude
    "Use my current location" (expo-location; balanced accuracy)
  photos (up to 4 picked; uploaded on publish)
  hint: title 5+, description 20+, numeric price/area
  Publish
```

On success: `router.replace('/listing/:id')`. The feed query key is not invalidated from the
create screen; navigating back to the feed refetches on focus/staleness (15 s stale time) — an
explicit invalidation is a small polish item.

## 6. Ownership and permissions

| Actor | Browse | Create | Edit | Delete |
|---|---|---|---|---|
| Anonymous | ✅ | ❌ | ❌ | ❌ |
| Buyer | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |
| Seller (owner) | ✅ | ✅ | ✅ | ✅ |
| Seller (not owner) | ✅ | ✅ | ❌ 403 | ❌ 403 |
| Broker (owner) | ✅ | ✅ | ✅ | ✅ |
| Broker (not owner) | ✅ | ✅ | ❌ 403 | ❌ 403 |

`findOwnedListing()` loads the row, returns 404 if missing, and 403 if `ownerId !== req.user.id`.
Role is checked before ownership, so a buyer always gets 403 without leaking existence.

## 7. Images

**Current (implemented 2026-11-23):** the create form uses `expo-image-picker` for up to four
photos (JPEG/PNG/WebP, 8 MB each). On publish it calls `POST /api/uploads`; the API stores each
file in the Neon Object Storage `uploads` bucket under `listings/<userId>/<uuid>.<ext>` and
returns permanent `public_read` URLs, which are saved in `images`. Thumbnails appear in the form
with per-photo remove actions.

Uploads are rejected server-side by role (SELLER/BROKER only), MIME type and size. Client-side
resize/reorder and deletion of replaced objects remain nice-to-haves.

**Validation still required server-side:** URL parse, allowlist host if using a single
provider, max 10, max length per URL. Never fetch remote URLs inside the API (SSRF).

## 8. Location and maps

- Coordinates are mandatory for every listing.
- Create screen defaults to Bengaluru (12.9716, 77.5946) and offers GPS capture.
- Detail screen shows `MapPreview` (OSM deep link) and coordinates.
- Embedded MapLibre map and point picker are planned: [MAPS_AND_GEOLOCATION.md](MAPS_AND_GEOLOCATION.md).

Privacy: public exact coordinates can identify a property or owner. For production, consider
approximate public pins and exact reveal after contact. See
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §5.

## 9. Edge cases

| Case | Behaviour today | Desired |
|---|---|---|
| No images | First-letter placeholder card | Upload + placeholder |
| Invalid URL | Zod rejects the whole request | Per-image validation with preview |
| Price typed with commas | Stripped client-side | Keep; show formatted value |
| Negative coordinates | Accepted if within range | Fine |
| Duplicate listings | Allowed | Consider dedupe by title+coords |
| Owner deletes while chat open | Conversation stays, title null | Show "Listing removed" |
| Status changed to SOLD | Disappears from feed, detail badge | Add owner control |
| Very long description | 4000-char cap | Fine |
| Slow image host | RN Image shows blank | Add loading/fallback |

## 10. API map

| Operation | Endpoint | Auth |
|---|---|---|
| Feed | `GET /api/listings` | Public |
| My listings | `GET /api/listings/mine` | Bearer |
| Detail | `GET /api/listings/:id` | Public |
| Create | `POST /api/listings` | Bearer + SELLER/BROKER |
| Update | `PATCH /api/listings/:id` | Bearer + role + owner |
| Delete | `DELETE /api/listings/:id` | Bearer + role + owner |

Payloads: [API_SPEC.md](API_SPEC.md) §4.

## 11. Future work

1. Image upload and management.
2. Edit screen wired to `PATCH`.
3. City/price filter sheet and sort.
4. Status controls (mark sold/archive).
5. Map-based browsing and clustering.
6. Saved/favourite listings.
7. Listing analytics (views, enquiries).
8. Moderation/reporting.
