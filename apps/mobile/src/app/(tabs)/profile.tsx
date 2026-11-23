import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/format';
import { colors, radius, spacing, type } from '@/lib/theme';

const ROLE_COPY = {
  BUYER: 'Browse plots, message owners and brokers, and start a private call from any chat.',
  SELLER: 'Publish and manage your own land listings, then answer buyers in chat.',
  BROKER: 'Manage multiple listings and represent owners, with every enquiry in one inbox.',
} as const;

function InfoRow({
  icon,
  label,
  value,
  note,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
        {note ? <Text style={styles.infoNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  async function logout() {
    await signOut();
    router.replace('/(auth)/login' as Href);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.hero}>
          <Avatar name={user.name} uri={user.avatarUrl} size={72} ring />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel(user.role)}</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="compass-outline" size={19} color={colors.primary} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>What you can do</Text>
              <Text style={styles.sectionBody}>{ROLE_COPY[user.role]}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <InfoRow icon="mail-outline" label="Email" value={user.email} />
          <View style={styles.divider} />
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={user.phone ?? 'Not added'}
            note={user.phone ? 'Stored privately, never shown to other users.' : undefined}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionIcon}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Your number stays private</Text>
              <Text style={styles.sectionBody}>
                Buyers, sellers and brokers contact you through LandConnect chat and calls. Your
                phone number is never part of a listing or conversation.
              </Text>
            </View>
          </View>
        </Card>

        <Button label="Sign out" icon="log-out-outline" variant="secondary" onPress={logout} />

        <Text style={styles.footer}>LandConnect prototype · private by design</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xl },
  heading: { ...type.display, paddingTop: spacing.sm },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  name: { ...type.h1, fontSize: 23, color: colors.white, marginTop: spacing.xs },
  email: { ...type.caption, color: 'rgba(255,255,255,0.72)' },
  rolePill: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  rolePillText: {
    ...type.micro,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: { gap: spacing.md },
  cardTitle: { ...type.title },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: { flex: 1, gap: 4 },
  sectionTitle: { ...type.title, fontSize: 16 },
  sectionBody: { ...type.caption, color: colors.textMuted, lineHeight: 19 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1, gap: 2 },
  infoLabel: { ...type.micro, color: colors.textMuted, textTransform: 'uppercase' },
  infoValue: { ...type.bodyStrong, fontSize: 14 },
  infoNote: { ...type.caption, fontSize: 12, color: colors.textFaint },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  footer: {
    ...type.caption,
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
