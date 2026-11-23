import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/lib/theme';

/**
 * Lightweight map card. Opens the exact coordinates in OpenStreetMap.
 * The schematic is a map plate, not decoration: one road cross and a pin.
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
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
    >
      <View style={styles.plate}>
        <View style={styles.roadHorizontal} />
        <View style={styles.roadVertical} />
        <View style={styles.pin}>
          <Ionicons name="location" size={20} color={colors.white} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.coords}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
        <View style={styles.ctaRow}>
          <Text style={styles.cta}>Open in OpenStreetMap</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  plate: {
    width: 104,
    minHeight: 104,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '55%',
    height: 7,
    backgroundColor: colors.surface,
    opacity: 0.85,
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '38%',
    width: 5,
    backgroundColor: colors.surface,
    opacity: 0.7,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, paddingVertical: spacing.md, paddingRight: spacing.lg, gap: 3 },
  label: { ...type.bodyStrong, fontSize: 14, lineHeight: 20 },
  coords: { ...type.caption, fontSize: 12, color: colors.textMuted },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  cta: { ...type.label, color: colors.primary },
});
