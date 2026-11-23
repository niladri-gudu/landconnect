import { Ionicons } from '@expo/vector-icons';
import { useLocalParticipant, useTracks, VideoTrack } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CallKind } from '@landconnect/shared';

import { colors, radius, spacing, type } from '@/lib/theme';

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
          <VideoTrack trackRef={remoteVideo} style={styles.remoteVideo} objectFit="cover" />
        ) : (
          <View style={styles.avatar}>
            <Ionicons
              name={kind === 'VIDEO' ? 'videocam-outline' : 'headset-outline'}
              size={40}
              color={colors.white}
            />
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
          accessibilityRole="button"
          accessibilityLabel={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
        >
          <Ionicons
            name={isMicrophoneEnabled ? 'mic-outline' : 'mic-off-outline'}
            size={24}
            color={colors.white}
          />
        </Pressable>

        {kind === 'VIDEO' ? (
          <Pressable
            style={[styles.smallCircle, !isCameraEnabled && styles.smallActive]}
            onPress={toggleCamera}
            accessibilityRole="button"
            accessibilityLabel={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            <Ionicons
              name={isCameraEnabled ? 'videocam-outline' : 'videocam-off-outline'}
              size={24}
              color={colors.white}
            />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={[styles.circle, styles.reject]}
        onPress={onEnd}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="End call"
      >
        <Ionicons name="call" size={28} color={colors.white} />
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
    width: 102,
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { ...type.caption, color: 'rgba(255,255,255,0.7)' },
  error: { ...type.caption, fontSize: 12, color: '#FFB4AB', textAlign: 'center' },
  controlRow: { flexDirection: 'row', gap: spacing.xl },
  smallCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActive: { backgroundColor: 'rgba(255,180,171,0.22)' },
  circle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reject: { backgroundColor: colors.danger },
});
