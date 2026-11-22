import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

const ROLE_COPY = {
  BUYER: 'Browse land, chat with sellers and place calls.',
  SELLER: 'Publish and manage your land listings.',
  BROKER: 'Manage multiple listings and represent sellers.',
} as const;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  async function logout() {
    await signOut();
    router.replace('/(auth)/login' as Href);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Avatar name={user.name} uri={user.avatarUrl} size={84} />
        <Text style={styles.name}>{user.name}</Text>
        <Badge label={user.role} />
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>What you can do</Text>
        <Text style={styles.body}>{ROLE_COPY[user.role]}</Text>
        {user.phone ? (
          <Text style={styles.muted}>Phone on file: {user.phone} · never shown to other users</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.body}>
          Chats and calls happen inside LandConnect. Your phone number is never shared
          with buyers, sellers or brokers.
        </Text>
      </Card>

      <Button label="Sign out" variant="secondary" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
  muted: { fontSize: 12, color: colors.textMuted },
});
