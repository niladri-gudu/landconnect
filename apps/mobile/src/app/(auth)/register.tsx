import { Link, useRouter, type Href } from 'expo-router';
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
import { colors, radius, spacing } from '@/lib/theme';

const ROLE_LABELS: Record<Role, string> = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  BROKER: 'Broker',
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Choose how you want to use LandConnect.</Text>

          <View style={styles.roles}>
            {ROLES.map((item) => {
              const selected = role === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setRole(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.roleChip, selected && styles.roleChipSelected]}
                >
                  <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
                    {ROLE_LABELS[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.form}>
            <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Phone (optional, never shown publicly)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 8 characters"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
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
  screen: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, paddingTop: spacing.xxl },
  title: { color: colors.white, fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#B8D8D2', fontSize: 15 },
  roles: { flexDirection: 'row', gap: spacing.sm },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#2E7A6F',
    alignItems: 'center',
  },
  roleChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  roleText: { color: colors.white, fontWeight: '600' },
  roleTextSelected: { color: colors.primaryDark },
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
