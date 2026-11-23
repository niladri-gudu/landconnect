import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { getInitials } from '@/lib/format';
import { colors, radius, spacing, type } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;
type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  iconAfter,
  fullWidth = true,
  size = 'large',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconName;
  iconAfter?: IoniconName;
  fullWidth?: boolean;
  size?: 'large' | 'small';
  accessibilityLabel?: string;
}) {
  const isDisabled = disabled || loading;
  const foreground =
    variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{
        color:
          variant === 'primary' || variant === 'danger'
            ? 'rgba(255,255,255,0.18)'
            : colors.primarySoft,
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'small' && styles.buttonSmall,
        fullWidth ? styles.buttonFull : styles.buttonInline,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'tonal' && styles.buttonTonal,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
          {iconAfter ? <Ionicons name={iconAfter} size={18} color={foreground} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = 'tonal',
  size = 44,
  disabled,
  selected,
  style,
}: {
  name: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'tonal' | 'plain' | 'outline' | 'dark';
  size?: number;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = variant === 'dark' ? colors.white : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      android_ripple={{ color: colors.primarySoft, borderless: true }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'tonal' && styles.iconButtonTonal,
        variant === 'plain' && styles.iconButtonPlain,
        variant === 'outline' && styles.iconButtonOutline,
        variant === 'dark' && styles.iconButtonDark,
        selected && styles.iconButtonSelected,
        pressed && !disabled && { opacity: 0.72 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Ionicons name={name} size={Math.round(size * 0.48)} color={tint} />
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  icon,
  style,
  multiline,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  icon?: IoniconName;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          multiline && styles.inputShellMultiline,
          focused && styles.inputShellFocused,
          error ? styles.inputShellError : null,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.textFaint} /> : null}
        <TextInput
          {...props}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !revealed}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={colors.textFaint}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const avatarPalette = ['#2F6B4F', '#3D7A5A', '#24543E', '#4A7C59', '#1F5D45'];

export function Avatar({
  name,
  uri,
  size = 44,
  ring = false,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const seed = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const background = avatarPalette[seed % avatarPalette.length];

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
        },
        ring && { borderWidth: 2, borderColor: colors.white },
      ]}
      accessibilityLabel={name}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: 'green' | 'neutral' | 'warning' | 'danger' | 'outline';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'green' && styles.badgeGreen,
        tone === 'neutral' && styles.badgeNeutral,
        tone === 'warning' && styles.badgeWarning,
        tone === 'danger' && styles.badgeDanger,
        tone === 'outline' && styles.badgeOutline,
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === 'green' && { color: colors.primary },
          tone === 'neutral' && { color: colors.textMuted },
          tone === 'warning' && { color: colors.warning },
          tone === 'danger' && { color: colors.danger },
          tone === 'outline' && { color: colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IoniconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="tonal"
          fullWidth={false}
          size="small"
        />
      ) : null}
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
      </View>
      <Text style={styles.emptyTitle}>Couldn’t load this</Text>
      <Text style={styles.emptyBody}>{message ?? 'Check your connection and try again.'}</Text>
      {onRetry ? (
        <Button label="Try again" onPress={onRetry} variant="tonal" fullWidth={false} size="small" />
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

function usePulse() {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

export function SkeletonBlock({
  height,
  width = '100%',
  radius: blockRadius = radius.md,
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: blockRadius, backgroundColor: colors.surfaceMuted },
        { opacity },
        style,
      ]}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonBlock height={190} radius={0} />
      <View style={styles.skeletonBody}>
        <SkeletonBlock height={20} width="45%" />
        <SkeletonBlock height={18} width="85%" />
        <SkeletonBlock height={14} width="60%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  buttonFull: { alignSelf: 'stretch' },
  buttonInline: { alignSelf: 'flex-start' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonTonal: { backgroundColor: colors.primarySoft },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { ...type.bodyStrong, fontWeight: '700' },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  iconButtonTonal: { backgroundColor: colors.primarySoft },
  iconButtonPlain: { backgroundColor: 'transparent' },
  iconButtonOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  iconButtonDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  iconButtonSelected: { backgroundColor: colors.primary },
  field: { gap: 7 },
  fieldLabel: { ...type.label, color: colors.textMuted },
  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  inputShellFocused: { borderColor: colors.primary },
  inputShellError: { borderColor: colors.danger },
  input: {
    ...type.body,
    flex: 1,
    paddingVertical: 0,
    color: colors.text,
    minHeight: 22,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  fieldHint: { ...type.caption, fontSize: 12, color: colors.textFaint },
  fieldError: { ...type.caption, fontSize: 12, color: colors.danger },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: colors.white, fontWeight: '700' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeGreen: { backgroundColor: colors.primarySoft },
  badgeNeutral: { backgroundColor: colors.surfaceMuted },
  badgeWarning: { backgroundColor: colors.warningSoft },
  badgeDanger: { backgroundColor: colors.dangerSoft },
  badgeOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  badgeText: { ...type.micro, textTransform: 'uppercase' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...type.h2, fontSize: 18, textAlign: 'center' },
  emptyBody: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingLabel: { ...type.caption, color: colors.textMuted },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: { ...type.title },
  sectionAction: { ...type.label, color: colors.primary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  skeletonBody: { padding: spacing.lg, gap: spacing.sm },
});
