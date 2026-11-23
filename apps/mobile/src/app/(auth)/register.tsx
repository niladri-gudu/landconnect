import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROLES, type Role } from '@landconnect/shared';

import { Button, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing, type } from '@/lib/theme';

const ROLE_OPTIONS: Record<
  Role,
  { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }
> = {
  BUYER: {
    icon: 'search-outline',
    title: 'I’m buying',
    detail: 'Browse land and message owners.',
  },
  SELLER: {
    icon: 'home-outline',
    title: 'I’m selling',
    detail: 'Publish and manage your own plots.',
  },
  BROKER: {
    icon: 'people-outline',
    title: 'I’m a broker',
    detail: 'List land for multiple owners.',
  },
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
      });
      router.replace('/(tabs)' as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Choose how you’ll use LandConnect. You can always browse, chat and call.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>How will you use it?</Text>
            <View style={styles.roles}>
              {ROLES.map((item) => {
                const option = ROLE_OPTIONS[item];
                const selected = role === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setRole(item)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${option.title}. ${option.detail}`}
                    style={({ pressed }) => [
                      styles.roleCard,
                      selected && styles.roleCardSelected,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={selected ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={styles.roleCopy}>
                      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
                        {option.title}
                      </Text>
                      <Text style={styles.roleDetail}>{option.detail}</Text>
                    </View>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={21}
                      color={selected ? colors.primary : colors.borderStrong}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.divider} />

            <Field
              label="Full name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              placeholder="Your name"
              icon="person-outline"
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              icon="mail-outline"
            />
            <Field
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+91"
              icon="call-outline"
              hint="Stored privately and never shown to other users."
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="At least 8 characters"
              icon="lock-closed-outline"
            />

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button label="Create account" onPress={submit} loading={busy} />

            <Text style={styles.switch}>
              Already registered?{' '}
              <Link href={'/(auth)/login' as Href} style={styles.link}>
                Sign in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDark },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.xxl },
  hero: { gap: spacing.sm, paddingTop: spacing.xxl },
  title: { ...type.h1, color: colors.white },
  subtitle: { ...type.body, color: 'rgba(255,255,255,0.72)', maxWidth: 330 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  sectionTitle: { ...type.title },
  roles: { gap: spacing.sm },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: { backgroundColor: 'rgba(255,255,255,0.75)' },
  roleCopy: { flex: 1, gap: 2 },
  roleTitle: { ...type.bodyStrong, fontSize: 14 },
  roleTitleSelected: { color: colors.primary },
  roleDetail: { ...type.caption, fontSize: 12, color: colors.textMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
  switch: { textAlign: 'center', ...type.caption, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
