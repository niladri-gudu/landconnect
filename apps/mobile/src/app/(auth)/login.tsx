import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing, type } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
      router.replace('/(tabs)' as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
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
            <Image
              source={require('../../../assets/images/brand-mark.png')}
              style={styles.brandMark}
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.brandName}>LandConnect</Text>
            <Text style={styles.tagline}>
              Find land. Talk directly. Keep your number private.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardBody}>Sign in to keep exploring land.</Text>
            </View>

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
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              placeholder="Your password"
              icon="lock-closed-outline"
            />

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button label="Sign in" onPress={submit} loading={busy} />

            <Text style={styles.switch}>
              New here?{' '}
              <Link href={'/(auth)/register' as Href} style={styles.link}>
                Create an account
              </Link>
            </Text>
          </View>

          <Text style={styles.footer}>Private chat and calling, inside one app.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDark },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.xxl,
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  brandMark: { width: 68, height: 68, marginBottom: spacing.sm },
  brandName: { ...type.display, color: colors.white },
  tagline: {
    ...type.body,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  cardHeader: { gap: spacing.xs, marginBottom: spacing.xs },
  cardTitle: { ...type.h1, fontSize: 23 },
  cardBody: { ...type.caption, color: colors.textMuted },
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
  footer: {
    ...type.caption,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
