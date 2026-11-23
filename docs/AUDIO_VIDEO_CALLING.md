# Audio and Video Calling (Key Requirement)

**Baseline:** 2026-11-21
**Status (2026-11-23):** call lifecycle, authorization, socket events, LiveKit token issuance,
the LiveKit RN room join, mic/camera publishing, remote video rendering, track-backed controls
and the app-level incoming-call overlay are implemented. Audio media is verified between a
Nothing Phone 3a and the Android emulator: LiveKit Cloud room joined, ICE/DTLS connected, audio
RTP flowing both ways over the phone's cellular network (~60 ms RTT). Call payloads embed both
participants, runtime microphone/camera prompts run before a call is created, accepted, or
joined, and an unanswered outgoing call ends itself after 45 s. Remaining: confirm listening
both ways, verify the video path, and record the flow.
**Related:** [ARCHITECTURE.md](ARCHITECTURE.md) · [REALTIME_MESSAGING.md](REALTIME_MESSAGING.md) · [API_SPEC.md](API_SPEC.md) · [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

---

## 1. What exists today

### 1.1 Server

| Piece | File | Behaviour |
|---|---|---|
| Call session model | `prisma/schema.prisma` | `CallSession` with kind, status, roomName, timestamps |
| Create call | `routes/calls.ts` | Participant check, receiver derivation, unique room, `RINGING` |
| Incoming event | `routes/calls.ts` | `call:incoming` to `user:<receiver>` and `conversation:<id>` |
| Answer | `routes/calls.ts` | Receiver-only; accept → `ACTIVE` + `startedAt`; reject → `REJECTED` + `endedAt` |
| Answer events | `routes/calls.ts` | `call:accepted` / `call:rejected` to the conversation room |
| LiveKit token | `routes/calls.ts`, `lib/livekit.ts` | 2-hour room-join grant when `LIVEKIT_*` is set; 503 otherwise |
| Token for initiator | `GET /calls/:id/token` | Participant-only, ACTIVE-only |
| End | `routes/calls.ts` | Participant-only; `ENDED` idempotent; `call:ended` |
| Signalling relay | `realtime.ts` | `webrtc:offer` / `webrtc:answer` / `webrtc:ice` to the conversation room |

### 1.2 Client

| Piece | File | Behaviour |
|---|---|---|
| Call screen | `app/call/[callId].tsx` | Loads call, joins socket room, renders ringing/active/ended |
| Start call | `app/listing/[id].tsx`, `app/chat/[conversationId].tsx` | Create conversation if needed, `POST /calls`, navigate |
| Answer/reject | `app/call/[callId].tsx` | `POST /calls/:id/answer` |
| End | `app/call/[callId].tsx` | `POST /calls/:id/end`, back |
| Controls | `components/active-call.tsx` | `useLocalParticipant` toggles the published mic/camera tracks |
| LiveKit room | `app/call/[callId].tsx` | `<LiveKitRoom>` joins with the token after ACTIVE; publishes mic (+ camera) |
| Remote video | `components/active-call.tsx` | `useTracks` + `VideoTrack` renders the remote camera and local preview |
| Incoming overlay | `components/incoming-call.tsx` | App-level ring modal on `call:incoming`; accept/decline from any screen |

### 1.3 The gap

The code path is complete through LiveKit. What remains is **operational verification**: set
`LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` on the API, produce a development
build (Expo Go cannot load native WebRTC), and run the two-device matrix below. The Socket.IO
`webrtc:*` relay is still signalling-only; LiveKit is the shipped media path.

## 2. Target architecture

```
┌────────────┐       1. POST /api/calls            ┌────────────┐
│  Caller    │ ──────────────────────────────────▶ │    API     │
│  app       │ ◀────────────────────────────────── │            │
└─────┬──────┘       2. CallDto (RINGING)           └─────┬──────┘
      │                                                   │ 3. call:incoming
      │                                                   ▼
      │                                            ┌────────────┐
      │                                            │ Receiver   │
      │                                            │ app        │
      │                                            └─────┬──────┘
      │        4. POST /calls/:id/answer {accept:true}    │
      │                                                   │
      │        5. 200 { call, livekit:{url,room,token} }   │
      │                                                   │
      │        6. LiveKit room join (WebRTC media)         │
      ▼                                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                  LiveKit SFU (or P2P fallback)               │
│   audio tracks · camera tracks · TURN/relay for NAT          │
└──────────────────────────────────────────────────────────────┘
```

The API stays a control plane: authorization, session state, room naming, tokens, events. Media
is peer-to-SFU.

## 3. Call state machine

```
                 create
                   │
                   ▼
              ┌─────────┐  accept   ┌────────┐  end   ┌────────┐
              │ RINGING │──────────▶│ ACTIVE │───────▶│ ENDED  │
              └────┬────┘           └────────┘        └────────┘
                   │ reject
                   ▼
              ┌──────────┐
              │ REJECTED │
              └──────────┘

              (timeout — not implemented)
              RINGING ──────────────▶ MISSED
```

Rules:

| Transition | Who | Guard | Side effects |
|---|---|---|---|
| create | participant | conversation membership, other participant exists | RINGING, room, `call:incoming` |
| accept | receiver | status RINGING | ACTIVE, `startedAt`, `call:accepted`, LiveKit grant |
| reject | receiver | status RINGING | REJECTED, `endedAt`, `call:rejected` |
| end | either | not already ENDED/REJECTED | ENDED, `endedAt`, `call:ended` |
| missed | server job | RINGING older than 30–45 s | MISSED, `endedAt`, `call:missed` (new) |

Idempotency: `end` returns the existing terminal call. `answer` is not idempotent — a second
answer returns 409, which is correct.

## 4. Option A — LiveKit React Native (recommended)

**Why:** the server already mints LiveKit tokens; LiveKit supplies an SFU and TURN-style relay,
which makes calls work across networks and devices without building media infrastructure. It is
the shortest reliable path to a working demo.

### 4.1 Packages (verify compatibility with Expo 58 / RN 0.88)

```
@livekit/react-native
@livekit/react-native-expo-plugin
@livekit/react-native-webrtc
livekit-client
expo-dev-client
```

### 4.2 Configuration

`app.json`:

```jsonc
{
  "expo": {
    "plugins": [
      // existing plugins…
      "@livekit/react-native-expo-plugin"
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "LandConnect uses the camera for video calls.",
        "NSMicrophoneUsageDescription": "LandConnect uses the microphone for audio and video calls."
      }
    },
    "android": {
      "permissions": [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.BLUETOOTH_CONNECT"
      ]
    }
  }
}
```

Build a development client **before** writing media code:

```bash
cd apps/mobile
npx expo install expo-dev-client
eas build --profile development --platform android
```

Expo Go cannot load the native WebRTC module.

### 4.3 Client integration sketch

```tsx
// lib/livekit.ts (new)
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

registerGlobals();

// call/[callId].tsx (after accept / for initiator after ACTIVE)
<LiveKitRoom
  serverUrl={grant.url}
  token={grant.token}
  connect
  audio
  video={call.kind === 'VIDEO'}
  onDisconnected={() => router.back()}
>
  <CallStage kind={call.kind} />
</LiveKitRoom>
```

`CallStage` uses `useTracks([Track.Source.Camera, Track.Source.Microphone])` to render remote
video and toggle local audio/video with `trackPublication.mute/unmute` or the room's local
participant API. The existing mute/camera buttons should call those APIs instead of local state.

### 4.4 Token flow

- Receiver: `POST /calls/:id/answer {accept:true}` returns `{ call, livekit }` — connect
  immediately with that grant.
- Caller: after `call:accepted`, call `GET /calls/:id/token` (ACTIVE-only) and connect.
- If `livekit` is absent, fall back to Option B or show a clear "media unavailable" state.

### 4.5 Server env

```dotenv
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
```

For a zero-cost demo, run LiveKit locally with Docker and expose it via a tunnel, or use the
LiveKit Cloud free tier. Document whichever is used in the submission.

## 5. Option B — Raw WebRTC over Socket.IO (fallback)

**Why:** no external media service; the relay events already exist.
**Cost:** you must build signalling, peer connection lifecycle, and TURN yourself; calls often
fail without TURN.

### 5.1 Packages

```
react-native-webrtc
expo-dev-client
```

Config plugin/permissions as above (camera + microphone).

### 5.2 Flow

```
Caller                                   Receiver
getUserMedia({audio, video})             getUserMedia(...)
create RTCPeerConnection(config)         create RTCPeerConnection(config)
add local tracks                         add local tracks
createOffer → setLocalDescription        on offer:
emit webrtc:offer {conversationId, sdp}  setRemoteDescription
                                         createAnswer → setLocalDescription
                                         emit webrtc:answer {conversationId, sdp}
on answer: setRemoteDescription          on ice: addIceCandidate
emit webrtc:ice on candidate             emit webrtc:ice
ontrack → render remote stream           ontrack → render remote stream
```

The server relays to the conversation room and stamps `from`, so each client ignores its own
messages and applies only the other party's SDP/ICE.

### 5.3 ICE servers

```js
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // TURN is required for many mobile networks:
    // { urls: 'turn:<host>:3478', username: '…', credential: '…' },
  ],
};
```

Without TURN, expect failures on carrier-grade NAT and some corporate Wi-Fi. If using P2P for the
demo, test on the actual demo network early.

## 6. Incoming calls outside the chat screen (P0)

Today only `call/[callId].tsx` listens for call events. A receiver on the feed never sees the
call. Fix:

1. Connect the socket once the user is authenticated (in `AuthProvider` or a new
   `CallProvider`), not only inside chat.
2. On `call:incoming`, ignore events where `receiverId !== user.id` (the initiator also receives
   the conversation-room copy).
3. If the app is not already on that call route, present a full-screen incoming view or
   `router.push('/call/<id>')`.
4. Add an audible ringtone/vibration (`expo-av` or `expo-haptics`) — optional but improves the
   demo.
5. Cancel the incoming UI on `call:rejected`, `call:ended`, or a local timeout.

Suggested shape:

```tsx
// lib/calls.tsx
useEffect(() => {
  if (!accessToken) return;
  const socket = connectSocket();
  const onIncoming = (call: CallDto) => {
    if (call.receiverId !== user?.id || call.status !== 'RINGING') return;
    setIncoming(call);
  };
  socket.on(SOCKET_EVENTS.callIncoming, onIncoming);
  return () => socket.off(SOCKET_EVENTS.callIncoming, onIncoming);
}, [accessToken, user?.id]);
```

Render `<IncomingCallOverlay call={incoming} />` at the root layout. Accept navigates to the call
route; reject calls the answer endpoint with `accept:false`.

**Limitation:** with the app backgrounded or terminated, there is no push delivery. For the
prototype, demo with both apps in the foreground; state this explicitly.

## 7. Media UX details

| State | UI |
|---|---|
| Caller ringing | "Calling…", cancel (end) button |
| Receiver ringing | "Incoming call", accept/reject |
| Connecting | Spinner/label between accept and first media |
| Active audio | Avatar, mute toggle, end |
| Active video | Remote video full-bleed, local preview corner, camera/mute/end |
| Rejected | Caller returns with a brief message/toast |
| Ended | Both return; optionally show duration |
| Permission denied | Explain and offer settings or end |
| Network poor | Connection quality indicator; end gracefully |

Add `expo-keep-awake` during calls to prevent screen sleep.

## 8. Security

- Only conversation participants can create or act on a call.
- Only the receiver can answer.
- LiveKit tokens are minted server-side, scoped to one room, with a 2-hour TTL and publish/
  subscribe grants.
- Never ship `LIVEKIT_API_SECRET` in the app.
- Call DTOs contain no phone numbers or emails.
- Room names are random UUIDs, not guessable from conversation ids.
- Consider adding rate limits on call creation to prevent spam ringing (KI-08).

## 9. Test matrix

| # | Scenario | Devices | Expected |
|---|---|---|---|
| C1 | Audio call, same Wi-Fi | 2 Android | Both hear; end works both ways |
| C2 | Video call, same Wi-Fi | 2 Android | Both see/hear; camera toggle works |
| C3 | Audio call, one on mobile data | Android + iPhone/Android | Connects via TURN/SFU |
| C4 | Reject | 2 devices | Caller sees rejection, returns |
| C5 | End from receiver | 2 devices | Caller returns, status ENDED |
| C6 | Cancel before answer | 2 devices | Call becomes ENDED (or MISSED later) |
| C7 | App on feed when called | 2 devices | Incoming UI appears (after P0 fix) |
| C8 | Mic permission denied | 1 device | Clear error, no crash |
| C9 | Camera permission denied (video) | 1 device | Audio-only or clear error |
| C10 | Background app during call | 1 device | Audio behaviour documented; no crash |
| C11 | Reconnect socket mid-call | 1 device | Call state recovers or ends cleanly |
| C12 | Second call while active | 2 devices | Defined behaviour (reject/busy) |

Record results in [TESTING_STRATEGY.md](TESTING_STRATEGY.md).

## 10. Demo script (calling first)

1. Two phones side by side; log in as buyer and seller.
2. Seller opens My Listings; buyer opens the same listing.
3. Buyer taps **Audio**: seller's phone shows incoming; accept; say hello both ways.
4. End; show both return cleanly.
5. Repeat **Video**: both cameras visible; toggle camera/mute; end.
6. Reject a call to show the rejection path.
7. Scroll the profile/listings to show no phone number anywhere.

Target: 60–90 seconds of uninterrupted calling footage.

## 11. Risks and fallbacks

| Risk | Likelihood | Mitigation |
|---|---|---|
| LiveKit RN SDK incompatible with Expo 58/RN 0.88 | Medium | Test the dev build on day 1; fall back to raw `react-native-webrtc` |
| EAS build queue delays | Medium | Start the first dev build immediately; keep a local Android build as backup |
| No TURN reachable on demo network | Medium | Use LiveKit (has relay) or a TURN service; test on the demo network |
| Native module breaks Expo Go workflow | High (expected) | Use a dev client/preview APK for all testing |
| Time lost on media | High | Freeze feature work; media is the scored criterion |
| Permissions crash on Android | Medium | Declared CAMERA/RECORD_AUDIO/MODIFY_AUDIO_SETTINGS; `lib/call-permissions.ts` requests them before joining and surfaces denial with Settings/retry |

## 12. Definition of done

- [ ] Two accounts on two devices complete an audio call and hear each other. *(Media path
      verified 2026-11-23: both sides connected with audio RTP in each direction; listening
      confirmation pending.)*
- [ ] Two accounts complete a video call and see each other.
- [ ] Accept, reject, cancel and end all work from both sides.
- [x] Incoming call appears when the receiver is not in the chat. (Verified 2026-11-23: the
      seller was on My Listings when the ring overlay appeared.)
- [x] Permission denial is handled without a crash. (Runtime prompts, alert, and Settings/retry
      actions implemented; device-denial test pending.)
- [x] No phone number appears in any call surface or payload.
- [ ] The flow is recorded for the demo video.
