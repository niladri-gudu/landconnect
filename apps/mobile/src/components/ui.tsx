import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, shadow, spacing } from '@/lib/theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        (pressed || isDisabled) && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary' && styles.buttonLabelSecondary,
          variant === 'ghost' && styles.buttonLabelGhost,
        ]}
      >
        {loading ? 'Please wait…' : label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.inputMultiline]}
        {...props}
      />
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyBody}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.75 },
  buttonLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  buttonLabelSecondary: { color: colors.primary },
  buttonLabelGhost: { color: colors.primary },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  avatar: {
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bubbleOut,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  empty: { padding: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
