# LandConnect — Technical Assignment Submission

**Candidate:** Niladri Gudu

| Deliverable | Link |
|---|---|
| GitHub repository | <https://github.com/niladri-gudu/landconnect> |
| Working demo — Android APK | <https://expo.dev/artifacts/eas/hNTK89HEZXizgQjhwMUUZrAgHs2OEo3A0mWpPRTH6cE.apk> |
| Expo build page | <https://expo.dev/accounts/niladri_expo/projects/landconnect/builds/be89632d-bcdf-4c37-9804-d494517e5112> |
| Demonstration video | <https://youtu.be/FUXDR2tnuzk> |
| Hosted API | <https://landconnect.hostless.app> (`/health`) |
| Technical documentation | [README.md](README.md) and [docs/](docs/) |
| Video-call evidence (two devices) | [screenshot](docs/screenshots/video-call-devices.jpeg) |
| Call-history evidence | [screenshot](docs/screenshots/call-history.png) |

## Demo accounts

Password `password123` for all three:

| Role | Email |
|---|---|
| Buyer | buyer@landconnect.dev |
| Seller | seller@landconnect.dev |
| Broker | broker@landconnect.dev |

Install the APK on Android. Expo Go cannot load the native WebRTC module required for calling.

## What is implemented

- Registration/login with Buyer, Seller and Broker roles and role-based access.
- Community feed with search; listing detail with images, price, area, description and location.
- Seller/broker listing creation, editing and deletion; photo upload; GPS and tap-to-place
  geotagging with an embedded MapLibre map.
- Realtime 1:1 chat with delivery/read receipts, unread counts and an in-app message banner.
- In-app audio and video calling: initiate, receive, accept, reject, end, timers, and call
  history entries (missed, declined, completed with duration). No phone numbers are exchanged.
- Missed rings and messages are recovered when the app reconnects or returns to the foreground.

## Stack

Expo SDK 58 / React Native / TypeScript / Expo Router; Node.js / Express / Zod; PostgreSQL on Neon
with Prisma; Socket.IO for realtime; LiveKit for call media; EAS for the Android build;
hostless.cloud for the hosted API.

## Notes

- Incoming calls and messages require the app to be open; push/background delivery is documented
  as a limitation in [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).
- Video calling was verified between two physical devices and between a phone and the emulator;
  the supplementary screenshot above shows a live two-person video call.
- AI tools (Claude Code) were used for implementation assistance and documentation; all code was
  reviewed, run and verified by the author.
