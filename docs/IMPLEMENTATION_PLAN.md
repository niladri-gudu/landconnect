# Implementation Plan

**Today:** Saturday, 2026-11-21
**Deadline:** Wednesday, 2026-11-25, 23:59 IST
**Working days left:** 4 (Nov 21, 22, 23, 24) + deadline-day buffer
**Owner:** Niladri Gudu
**Related:** [TASK_TRACKER.md](TASK_TRACKER.md) · [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) · [KNOWN_ISSUES.md](KNOWN_ISSUES.md) · [DEMO_AND_SUBMISSION.md](DEMO_AND_SUBMISSION.md)

---

## 1. Priorities

| Priority | Meaning | Examples |
|---|---|---|
| **P0** | Blocks a passing submission; do first | Real call media, incoming-call UI, camera/mic permissions, APK, demo video |
| **P1** | Materially improves evaluation | Embedded map, image upload, edit listing, hosted API, tests |
| **P2** | Nice to have if time remains | Typing indicators, missed-call timeout, skeletons, polish |
| **P3** | Explicitly out of scope | Push notifications, multi-party calls, payments |

**Hard rule:** calling is the key evaluation criterion. Do not start maps, uploads or polish
before an audio and video call works between two devices.

## 2. Critical path

```
Permissions + dev build ──▶ Media transport (LiveKit) ──▶ Two-device call test
        │                                                      │
        └──▶ Incoming-call global UI ──────────────────────────┤
                                                               ▼
                                                    Demo video ──▶ Submission
```

Everything else (maps, uploads, edit, tests, docs) runs in parallel or after the media path.

## 3. Day-by-day

### Day 1 — Saturday 21 Nov: make calling real

| Time | Task | Done when |
|---|---|---|
| Morning | Add `CAMERA`, `MODIFY_AUDIO_SETTINGS`, Bluetooth permissions; iOS camera/mic usage strings; install `expo-dev-client`; kick off an EAS development build | Build artifact installs on the test phone |
| Morning | Install/verify LiveKit RN packages against Expo 58 / RN 0.88 | Import compiles; app boots in the dev client |
| Midday | Connect the call screen to a LiveKit room with audio/video; wire mute/camera buttons to tracks | Local preview works |
| Afternoon | Two-device audio call; then video call | Both devices hear/see each other |
| Afternoon | Global incoming-call listener + overlay/route; receive from the feed | Caller reaches receiver outside chat |
| Evening | Permission denial, cancel, reject, end, reconnect; fix crashes | Test matrix C1–C9 passes |
| Evening | Commit and push the working media path | Remote branch has the change |

**Fallback if LiveKit RN is incompatible:** switch to `react-native-webrtc` + the existing
Socket.IO relay and add a TURN service. Timebox the decision to 2 hours.

### Day 2 — Sunday 22 Nov: maps, uploads, deployment

| Task | Done when |
|---|---|
| MapLibre + OpenFreeMap style in the dev build | Embedded map renders a marker on listing detail |
| Tap-to-pick location on create | Coordinates update from a map press |
| Image picker + Cloudinary upload (or signed endpoint) | 3 photos upload and appear in a listing |
| Listing edit screen using `PATCH` | Owner edits price/description and sees the update |
| Deploy API to Render/Fly/Railway with Neon + LiveKit env | `GET /health` works over HTTPS |
| Point `EXPO_PUBLIC_API_URL` at the deployed API | Login works from a phone on mobile data |
| Fix any build/native regressions | Dev build still installs and runs |

If a native map/image feature threatens the day, keep the OSM deep link and URL paste and move
on — do not risk the call demo.

### Day 3 — Monday 23 Nov: verify and build the APK

| Task | Done when |
|---|---|
| Full manual QA matrix (auth, roles, listings, chat, calls, maps) | [TESTING_STRATEGY.md](TESTING_STRATEGY.md) matrix filled |
| Add rate limiting and any quick security fixes | Auth/message/call endpoints throttled |
| Add API smoke tests (Vitest + supertest) if time | `pnpm test` runs green for critical routes |
| Fix all P0 bugs | No known blocker |
| `eas build --profile preview --platform android` (APK) | APK installs cleanly on a fresh device |
| Verify seeded demo accounts against the deployed API | Buyer/seller can log in |
| Update KNOWN_ISSUES and TASK_TRACKER | Status matches reality |

### Day 4 — Tuesday 24 Nov: record, document, submit

| Task | Done when |
|---|---|
| Write the demo script and rehearse the call flow | One clean run under 2 minutes |
| Record 4–6 minute walkthrough (calling first) | Video exported and uploaded |
| Update README/docs with final status, links and AI summary | No "pending deploy" placeholders |
| Create the public GitHub repo and push all commits | Fresh clone + documented setup works |
| Verify every link in incognito | Repo, APK, video, docs accessible |
| Send the submission email | Sent before 23:59 IST on Nov 24 |

### Wednesday 25 Nov: buffer only

Reserved for a failed build, a broken link, or a last-minute P0 fix. Do not plan new features.

## 4. Timeboxes

| Area | Max | If exceeded |
|---|---|---|
| LiveKit integration | 5 h | Switch to raw WebRTC / ship audio-only first |
| Incoming-call UI | 2 h | Route directly from the event handler |
| MapLibre | 3 h | Keep OSM deep link |
| Image upload | 2 h | Keep URL paste, document it |
| Edit screen | 1.5 h | Leave API-only, document it |
| API deployment | 2 h | Demo against LAN + state it |
| Video editing | 2 h | One-take screen recording is acceptable |

## 5. Risk register

| Risk | P | Impact | Mitigation | Owner |
|---|---|---|---|---|
| LiveKit RN SDK incompatible with Expo 58 | M | High | Test immediately; fall back to `react-native-webrtc` | N |
| EAS queue/build failure | M | High | Start builds early; keep local `expo run:android` fallback | N |
| No TURN on demo network | M | High | LiveKit relay or a TURN service; test on demo Wi-Fi + data | N |
| Native config breaks app | M | High | Rebuild after each config change; keep last good APK | N |
| Time lost on maps/uploads | H | Medium | Strict timeboxes; P1 features are droppable | N |
| Neon cold start during demo | M | Medium | Warm the API; keep the app open before evaluating | N |
| Secret accidentally committed | L | High | Check `git diff` before push; `.env` ignored | N |
| Device availability | L | High | Secure two Android phones today | N |

## 6. Definition of done (submission)

- [ ] Audio call works between two devices.
- [ ] Video call works between two devices.
- [ ] Incoming call appears outside the chat screen.
- [ ] Accept, reject, cancel, end all work.
- [ ] No phone number visible in any flow or payload.
- [ ] Public repo with setup instructions and no secrets.
- [ ] Installable APK or hosted demo.
- [ ] Demo video highlights calling.
- [ ] Technical docs complete and accurate.
- [ ] AI usage summary included.
- [ ] Submission email sent before the deadline.

## 7. Daily cadence

| When | Activity |
|---|---|
| Start of day | Review [TASK_TRACKER.md](TASK_TRACKER.md), pick P0s, set timeboxes |
| Midday | Test on a physical device; commit a working checkpoint |
| End of day | Push, update tracker/known issues, note tomorrow's P0 |
| Before sleep | Confirm the demo path still works end-to-end |
