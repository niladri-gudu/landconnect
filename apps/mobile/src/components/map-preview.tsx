import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

/**
 * Lightweight map card. Opens the exact coordinates in OpenStreetMap.
 * Swap this for @maplibre/maplibre-react-native once the Expo dev build
 * is in place — it needs a native module, so it can't run in Expo Go.
 */
export function MapPreview({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  function open() {
    void Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
    );
  }

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open map for ${label}`}
      style={({ pressed }) => [styles.box, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.pinWrap}>
        <Text style={styles.pin}>📍</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.coords}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
        <Text style={styles.hint}>Open in OpenStreetMap →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bubbleOut,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: { fontSize: 24 },
  body: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  coords: { fontSize: 13, color: colors.textMuted },
  hint: { fontSize: 12, color: colors.teal, fontWeight: '600' },
});
