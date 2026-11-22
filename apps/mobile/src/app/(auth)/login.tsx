import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
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
import { colors, radius, spacing } from '@/lib/theme';

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>LC</Text>
            </View>
            <Text style={styles.title}>LandConnect</Text>
            <Text style={styles.subtitle}>
              Discover land. Talk directly. No numbers exchanged.
            </Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 8 characters"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Sign in" onPress={submit} loading={busy} />
            <Text style={styles.switch}>
              New here?{' '}
              <Link href={'/(auth)/register' as Href} style={styles.link}>
                Create an account
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { color: colors.primaryDark, fontSize: 26, fontWeight: '800' },
  title: { color: colors.white, fontSize: 32, fontWeight: '800' },
  subtitle: {
    color: '#B8D8D2',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 280,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  error: { color: colors.danger, fontSize: 14 },
  switch: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  link: { color: colors.teal, fontWeight: '700' },
});
