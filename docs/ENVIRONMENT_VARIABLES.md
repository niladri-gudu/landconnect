# Environment Variables

**Baseline:** 2026-11-21
**Templates:** `apps/api/.env.example`, `apps/mobile/.env` (gitignored)
**Related:** [TECH_STACK.md](TECH_STACK.md) · [DEMO_AND_SUBMISSION.md](DEMO_AND_SUBMISSION.md)

---

## 1. API — `apps/api/.env`

Copy `apps/api/.env.example` and fill the values. Loaded by `dotenv` in `src/env.ts`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `''` | Pooled Postgres connection (Neon `-pooler` host) used by Prisma at runtime |
| `DIRECT_URL` | Recommended | — | Direct Postgres connection used by `prisma migrate` |
| `JWT_SECRET` | ✅ for real use | `dev-only-secret-change-me` | HS256 signing key for access tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Access-token lifetime (jsonwebtoken format) |
| `REFRESH_TOKEN_TTL_DAYS` | No | `30` | Refresh-token lifetime in days |
| `PORT` | No | `4000` | HTTP + Socket.IO port |
| `CORS_ORIGIN` | No | `*` | `*`, or comma-separated allowlist |
| `DB_KEEPWARM_MS` | No | `240000` | Ping Postgres before Neon's ~5-minute idle suspend; `0` disables |
| `LIVEKIT_URL` | For media | `''` | LiveKit WebSocket URL (`wss://…`) |
| `LIVEKIT_API_KEY` | For media | `''` | LiveKit API key |
| `LIVEKIT_API_SECRET` | For media | `''` | LiveKit API secret |

LiveKit is considered enabled only when **all three** `LIVEKIT_*` values are non-empty. Otherwise
`GET /api/calls/:id/token` returns 503 and the call screen reports that media is unavailable.

For calls, the app must also be a **development build** (Expo Go cannot load native WebRTC).
The API secret stays server-side; the mobile app only receives short-lived room tokens.

### Example

```dotenv
# Neon — pooled for the API, direct for migrations.
# pgbouncer=true avoids prepared-statement errors; connection_limit caps Prisma's pool.
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/landconnect?sslmode=require&pgbouncer=true&connection_limit=5"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/landconnect?sslmode=require"

JWT_SECRET="paste-a-long-random-string"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_TTL_DAYS=30

PORT=4000
CORS_ORIGIN="*"
# Keep the demo DB awake; 0 disables.
DB_KEEPWARM_MS=240000

# Optional — leave blank to run without LiveKit
LIVEKIT_URL=""
LIVEKIT_API_KEY=""
LIVEKIT_API_SECRET=""
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 2. Mobile — `apps/mobile/.env`

Expo only exposes variables prefixed with `EXPO_PUBLIC_`.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Recommended | `http://localhost:4000` | REST + Socket.IO base URL |

```dotenv
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

# Physical device on the same Wi-Fi
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000

# Deployed API
EXPO_PUBLIC_API_URL=https://landconnect-api.onrender.com
```

`lib/config.ts` strips a trailing slash. Restart Metro after changing the value.

**Never put secrets here.** Anything with `EXPO_PUBLIC_` is embedded in the app bundle.

## 3. Mobile native config — `apps/mobile/app.json`

Not environment variables, but required for calling and maps:

| Setting | Current | Needed for |
|---|---|---|
| `android.permissions` | `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `RECORD_AUDIO` | Add `CAMERA` for video |
| iOS `infoPlist.NSCameraUsageDescription` | missing | Video calling |
| iOS `infoPlist.NSMicrophoneUsageDescription` | missing | Audio/video calling |
| `expo-location` plugin copy | present | GPS |
| `expo-image-picker` plugin | present | Uploads |
| `scheme` | `landconnect` | Deep links |

## 4. EAS build environment

EAS profiles live in `apps/mobile/eas.json` (preview produces an APK). Provide the API URL per
profile via **EAS environment variables** or `eas.json` `env` blocks:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://landconnect-api.onrender.com" }
    }
  }
}
```

Set server-side secrets (never in `eas.json`) with EAS secrets or your host's dashboard:

```bash
eas secret:create --scope project --name JWT_SECRET --value "<secret>"
```

## 5. Deployment variables

### Render / Fly / Railway (API)

Set every API variable from §1 in the service dashboard. Ensure:

- `DATABASE_URL` uses the pooled Neon host.
- `DIRECT_URL` is available to the build step if migrations run there.
- `JWT_SECRET` is unique to production.
- `CORS_ORIGIN` lists the Expo web origin if used; native apps do not send Origin.
- `PORT` follows the platform's expectation (often injected).

### Neon

- Create one project; copy **pooled** and **direct** strings.
- Use the direct string for `prisma migrate` / `db push`.
- Keep SSL (`sslmode=require`).
- Consider a separate branch/database for demos vs tests.

### LiveKit

- Cloud: create a project, copy URL, API key and secret.
- Self-hosted: expose the WebSocket endpoint; set `LIVEKIT_URL` to it.
- `LIVEKIT_API_SECRET` stays server-side; the mobile app only receives short-lived tokens.

## 6. Local network notes

| Client | API URL |
|---|---|
| Android emulator | `http://10.0.2.2:4000` |
| iOS simulator | `http://localhost:4000` |
| Physical Android/iOS on same Wi-Fi | `http://<LAN-IP>:4000` |
| Expo web | `http://localhost:4000` |
| Deployed APK | `https://<api-host>` |

Find the LAN IP with `ipconfig` (Windows) or `ifconfig` (macOS/Linux). Ensure the firewall allows
inbound port 4000 for physical-device testing. For calls, both devices must be able to reach the
API; LiveKit handles NAT traversal for media.

## 7. Security rules

1. `.env` and `.env.*` are gitignored; only `.env.example` is committed.
2. Never paste real secrets into documentation, screenshots, chat or the demo video.
3. Use different secrets for dev, preview and production.
4. Rotate any key that was ever exposed.
5. `EXPO_PUBLIC_*` is public — no exceptions.
6. Do not log `DATABASE_URL`, tokens or passwords.

## 8. Quick verification

```bash
# API loads config and boots
pnpm api
curl http://localhost:4000/health
# → {"ok":true,"service":"landconnect-api","uptimeSeconds":42}

# Is Postgres warm? Run 3x: cold Neon shows seconds, warm shows <200 ms.
curl -w "\ntotal:%{time_total}s\n" http://localhost:4000/health/db
# → {"ok":true,"db":"up","latencyMs":145}

# LiveKit configured?
curl -H "Authorization: Bearer <access>" \
  http://localhost:4000/api/calls/<active-call-id>/token
# → 200 {url,room,token}  or  503 {"error":"LiveKit is not configured on this server"}
```
