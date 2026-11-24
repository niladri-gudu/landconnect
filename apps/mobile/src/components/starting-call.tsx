import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CallKind } from '@landconnect/shared';

import { colors, radius, spacing, type } from '@/lib/theme';
import { Avatar } from './ui';

/**
 * Shown the moment a call button is tapped, before permissions and the API
 * round-trips finish. Creating a call involves a system permission prompt and
 * two requests; without this the originating screen looks frozen.
 */
export function StartingCall({
  visible,
  kind,
  name,
  role,
  avatarUrl,
  onCancel,
}: {
  visible: boolean;
  kind: CallKind;
  name: string;
  role: string;
  avatarUrl: string | null;
  onCancel: () => void;
}) {
  // The overlay is part of the screen, not a native Modal: on Android a Modal
  // window blocks the call route from being pushed, leaving setup stuck on top.
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <SafeAreaView
      style={[styles.screen, StyleSheet.absoluteFill]}
      accessibilityViewIsModal
    >
      <StatusBar style="light" />

        <View style={styles.top}>
          <Text style={styles.kind}>{kind === 'VIDEO' ? 'Video call' : 'Audio call'}</Text>
          <View style={styles.statusPill}>
            <ActivityIndicator size="small" color={colors.mint} />
            <Text style={styles.statusText}>Connecting…</Text>
          </View>
        </View>

        <View style={styles.stage}>
          <Avatar name={name} uri={avatarUrl} size={104} ring />
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{role ? `${role} · ` : ''}LandConnect</Text>
          <Text style={styles.hint}>
            Setting up a private {kind === 'VIDEO' ? 'video' : 'audio'} call…
          </Text>
          <View style={styles.lockRow}>
            <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.lockText}>No phone numbers are exchanged</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [
              styles.circle,
              styles.decline,
              pressed && { opacity: 0.82 },
            ]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel call"
          >
            <Ionicons name="call" size={28} color={colors.white} style={styles.hangup} />
          </Pressable>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: spacing.xl,
    zIndex: 10,
    elevation: 10,
  },
  top: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  kind: { ...type.label, color: 'rgba(255,255,255,0.66)', textTransform: 'uppercase' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusText: { ...type.caption, fontSize: 12, color: colors.white },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  name: { ...type.h1, color: colors.white, marginTop: spacing.md },
  role: { ...type.caption, color: 'rgba(255,255,255,0.66)' },
  hint: {
    ...type.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.lg,
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  lockText: { ...type.caption, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  controls: { alignItems: 'center', paddingBottom: spacing.xl },
  circle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decline: { backgroundColor: colors.danger },
  hangup: { transform: [{ rotate: '135deg' }] },
});
