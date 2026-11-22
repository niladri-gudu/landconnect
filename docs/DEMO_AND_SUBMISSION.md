# Demo and Submission

**Deadline:** 2026-11-25 23:59 IST
**Target submission:** Tuesday 2026-11-24 (buffer day)
**Related:** [TASK_TRACKER.md](TASK_TRACKER.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) · [AI_DEVELOPMENT_RULES.md](AI_DEVELOPMENT_RULES.md)

---

## 1. Required deliverables

| # | Deliverable | Content | Status |
|---|---|---|---|
| 1 | GitHub repository | Source, README, setup instructions, docs, no secrets | ⬜ |
| 2 | Working demo | Preview APK (Android) and/or hosted API + Expo link | ⬜ |
| 3 | Demonstration video | 4–6 min, calling highlighted | ⬜ |
| 4 | Technical documentation | This doc set + EXPLANATION.md | ✅ |
| 5 | AI tools usage summary | Section in AI_DEVELOPMENT_RULES.md / email | ✅ draft |
| 6 | Submission email | All links, test accounts, notes | ⬜ |

## 2. Repository preparation

The local repo currently has **no commits and no remote**. Do this before recording:

```bash
cd D:/code/company_assessments/landconnect

# 1. Verify nothing sensitive is tracked
git status
git check-ignore apps/api/.env apps/mobile/.env
# both should be ignored

# 2. Stage and commit
git add .
git commit -m "feat: LandConnect prototype — auth, listings, messaging, calling"

# 3. Create a public GitHub repo (via gh or the website)
gh repo create landconnect-assessment --public --source=. --remote=origin --push
```

Repo hygiene checklist:

- [ ] `.env`, `.env.*` ignored; only `.env.example` committed.
- [ ] No keystores, APKs or `node_modules` committed.
- [ ] README quick start works from a fresh clone.
- [ ] `pnpm install && pnpm typecheck` passes.
- [ ] `apps/mobile/.env` uses a placeholder or documented value, not a personal LAN IP if
      possible.
- [ ] Docs links resolve on GitHub.
- [ ] License/attribution if third-party assets are used.
- [ ] `.agents/` and skills tooling are ignored (already in `.gitignore`).

## 3. Demo environment

### 3.1 API

Recommended: Render or Fly.io with Neon.

1. Create a Neon database (keep pooled + direct URLs).
2. Deploy `apps/api` (build: install, `prisma generate`, `prisma db push`; start: `tsx src/index.ts`
   or a compiled entry).
3. Set env: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, and `LIVEKIT_*`.
4. Run the seed against the hosted DB (`pnpm db:seed` with the production env) or seed locally
   against the same Neon database.
5. Verify `https://<api-host>/health`.
6. Warm the API before the demo to avoid cold starts.

### 3.2 Media

- LiveKit Cloud free project (recommended), or a self-hosted LiveKit server reachable from the
  phones.
- Set `LIVEKIT_URL` (wss), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` on the API only.

### 3.3 App build

Calling needs a build that contains the native WebRTC module — **Expo Go cannot join a call**.
Log in once:

```bash
npx eas-cli login
```

Set `EXPO_PUBLIC_API_URL` for the build (EAS environment variable or an `eas.json` `env` block),
then choose one:

```bash
cd apps/mobile

# Development client — live reload while testing calls
npx eas-cli build --profile development --platform android

# Standalone preview APK — what you submit
npx eas-cli build --profile preview --platform android
```

- The development profile installs the expo-dev-client. Start Metro with `pnpm mobile` and open
  the project URL from the dev client.
- The preview profile produces an installable APK. Rebuild after changing native config,
  permissions, or dependencies.
- Download the APK from the EAS build page.
- Install on a clean Android device; verify login and calling before sharing the link.
- For two-device calling, both devices must reach the same API and LiveKit project.
- Host the APK on Google Drive / GitHub Releases / EAS artifact link with public access.

### 3.4 Test accounts

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@landconnect.dev | password123 |
| Seller | seller@landconnect.dev | password123 |
| Broker | broker@landconnect.dev | password123 |

Include these in the README and the submission email.

## 4. Demonstration video

### 4.1 Format

- 4–6 minutes, 1080p, landscape or portrait consistently.
- Screen recording + voice-over; optionally picture-in-picture of two phones.
- Show real functionality; no mock-ups.
- Put calling in the first 90 seconds.

### 4.2 Script

| Time | Scene | Narration focus |
|---|---|---|
| 0:00–0:20 | Title + problem | "LandConnect connects buyers, sellers and brokers without sharing phone numbers." |
| 0:20–0:50 | Login/register, role choice | Auth, three roles, secure session |
| 0:50–1:20 | Community feed, search, listing detail | Images, price, area, location |
| 1:20–1:50 | Seller creates a listing (GPS/map) | Geotagging, validation |
| **1:50–3:20** | **Audio call** | Initiate, incoming, accept, speak both ways, end |
| **3:20–4:20** | **Video call** | Both cameras, mute/camera toggle, reject path |
| 4:20–4:50 | Chat | Live message delivery, private contact |
| 4:50–5:20 | Profile/privacy + architecture slide | No phone numbers; stack diagram |
| 5:20–5:40 | Known limitations + close | Honest status, next steps |

### 4.3 Recording checklist

- [ ] Two devices with the same APK and the deployed API.
- [ ] Both logged in before recording.
- [ ] Notifications silenced; no personal data on screen.
- [ ] Test the exact network used for recording.
- [ ] Audio level checked; voice-over clear.
- [ ] No secrets, tokens or LAN IPs visible.
- [ ] Calling works in one take or is edited cleanly.
- [ ] Video uploaded unlisted/public with link access enabled.

## 5. Documentation package

Point evaluators at `README.md`, which indexes:

- Product spec
- Requirements and status
- Stack and architecture
- Database and API
- Auth and security
- UI/UX and screen flow
- Calling, messaging, maps
- Implementation plan, tracker, testing, known issues
- AI usage

Include a short "How to run" section in the email as well, in case the repo link is opened on a
phone.

## 6. Submission email template

**Subject:** LandConnect Technical Assignment — Niladri Gudu

> Dear LandConnect Team,
>
> Please find my submission for the LandConnect technical assignment below.
>
> **GitHub repository:** <link>
> **Working demo (Android APK):** <link>
> **Demonstration video:** <link>
> **Technical documentation:** <repo>/README.md (index) and <repo>/docs/ (full doc set)
> **AI usage summary:** included in AI_DEVELOPMENT_RULES.md and summarised below
>
> **Demo accounts** (password `password123` for all):
> - Buyer — buyer@landconnect.dev
> - Seller — seller@landconnect.dev
> - Broker — broker@landconnect.dev
>
> **What works:** registration/login with three roles, role-based listing management,
> community feed with search, geotagged listings, in-app messaging, and in-app audio/video
> calling with accept, reject and end.
>
> **Stack:** Expo/React Native/TypeScript, Node.js/Express, PostgreSQL (Neon) with Prisma,
> Socket.IO for realtime, LiveKit for call media, EAS for the Android build.
>
> **Known limitations:** <e.g. maps currently use an OpenStreetMap deep link; image uploads use
> URLs; calls require the app to be in the foreground>. Details are in KNOWN_ISSUES.md.
>
> **AI tools:** Claude Code was used for scaffolding, implementation assistance and documentation.
> All code was reviewed, run and verified by me; architecture and security decisions are my own
> and can be explained in the interview.
>
> Thank you for your time.
>
> Best regards,
> Niladri Gudu
> <phone> · <email>

## 7. Link verification (incognito)

- [ ] GitHub repo opens without login and shows the README.
- [ ] README setup commands are correct and complete.
- [ ] APK link downloads without permission request.
- [ ] APK installs on a clean device.
- [ ] Video link plays without login.
- [ ] Documentation links resolve.
- [ ] Demo accounts work against the deployed API.
- [ ] Calling works on the evaluator-facing network (test on mobile data).

## 8. Final QA (night before)

| Check | Pass |
|---|---|
| Audio call, two devices | ☐ |
| Video call, two devices | ☐ |
| Incoming call outside chat | ☐ |
| Accept / reject / end / cancel | ☐ |
| No phone numbers visible | ☐ |
| Login as all three roles | ☐ |
| Create/delete listing | ☐ |
| Live messaging | ☐ |
| API `/health` over HTTPS | ☐ |
| APK fresh install | ☐ |
| Video plays | ☐ |
| Repo fresh clone + setup | ☐ |
| No secrets in git history | ☐ |

## 9. Timeline

| Date | Milestone |
|---|---|
| Sat 21 Nov | Media + incoming calls working; first APK attempt |
| Sun 22 Nov | Maps/uploads/deploy; API on HTTPS |
| Mon 23 Nov | Full QA; preview APK; bug fixes |
| Tue 24 Nov | Video; docs final; repo public; **email sent** |
| Wed 25 Nov | Buffer only — verify links, resend if needed |

## 10. Contingencies

- **APK build fails:** provide the Expo dev-build QR and a hosted API, plus the video; state the
  limitation.
- **LiveKit unavailable:** ship the P2P path or record calling over a local LiveKit Docker
  instance; do not fake media.
- **Hosted API down:** include a LAN/local fallback in the README and keep the demo video as the
  guaranteed artefact.
- **Time runs out:** submit what works, with KNOWN_ISSUES accurate; an honest partial submission
  beats a broken "complete" one.
