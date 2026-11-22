import { useLocalParticipant, useTracks, VideoTrack } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CallKind } from '@landconnect/shared';

import { colors, radius, spacing } from '@/lib/theme';

/**
 * Rendered inside <LiveKitRoom>. Reads the live room state so the mute and
 * camera buttons control actual published tracks, not local UI state.
 */
export function ActiveCall({
  kind,
  onEnd,
  busy,
}: {
  kind: CallKind;
  onEnd: () => void;
  busy: boolean;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  // Include local tracks so the self-view renders; LiveKit auto-subscribes remote video.
  const tracks = useTracks([Track.Source.Camera]);
  const remoteVideo = tracks.find((track) => !track.participant.isLocal);
  const localVideo = tracks.find((track) => track.participant.isLocal);
  const [error, setError] = useState<string | null>(null);

  function toggleMic() {
    setError(null);
    void localParticipant
      .setMicrophoneEnabled(!isMicrophoneEnabled)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not change microphone');
      });
  }

  function toggleCamera() {
    setError(null);
    void localParticipant
      .setCameraEnabled(!isCameraEnabled)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not change camera');
      });
  }

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        {kind === 'VIDEO' && remoteVideo ? (
          <VideoTrack
            trackRef={remoteVideo}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{kind === 'VIDEO' ? '📹' : '🎧'}</Text>
          </View>
        )}

        {kind === 'VIDEO' && localVideo ? (
          <VideoTrack
            trackRef={localVideo}
            style={styles.localVideo}
            objectFit="cover"
            mirror
            zOrder={1}
          />
        ) : null}
      </View>

      <Text style={styles.status}>
        {kind === 'VIDEO' ? 'Video connected' : 'Audio connected'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.controlRow}>
        <Pressable
          style={[styles.smallCircle, !isMicrophoneEnabled && styles.smallActive]}
          onPress={toggleMic}
          accessibilityLabel={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
        >
          <Text style={styles.smallGlyph}>{isMicrophoneEnabled ? '🎙️' : '🔇'}</Text>
        </Pressable>

        {kind === 'VIDEO' ? (
          <Pressable
            style={[styles.smallCircle, !isCameraEnabled && styles.smallActive]}
            onPress={toggleCamera}
            accessibilityLabel={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            <Text style={styles.smallGlyph}>{isCameraEnabled ? '🎥' : '📷'}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={[styles.circle, styles.reject]}
        onPress={onEnd}
        disabled={busy}
        accessibilityLabel="End call"
      >
        <Text style={styles.circleGlyph}>⏹</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    width: '100%',
  },
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  remoteVideo: { width: '100%', flex: 1 },
  localVideo: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 100,
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 44 },
  status: { color: '#B8D8D2', fontSize: 14 },
  error: { color: '#FFB4AB', textAlign: 'center', fontSize: 13 },
  controlRow: { flexDirection: 'row', gap: spacing.xl },
  smallCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0B4A41',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActive: { backgroundColor: '#155E53' },
  smallGlyph: { fontSize: 22 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reject: { backgroundColor: colors.danger },
  circleGlyph: { color: colors.white, fontSize: 28, fontWeight: '800' },
});
