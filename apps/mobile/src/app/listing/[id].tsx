import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CallKind } from '@landconnect/shared';

import { formatPrice } from '@/components/listing-card';
import { MapPreview } from '@/components/map-preview';
import { Avatar, Badge, Button, Card, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState<'chat' | CallKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listings.get(id),
    enabled: Boolean(id),
  });

  if (listing.isLoading) return <Loading />;
  if (listing.error || !listing.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Listing not found.</Text>
      </View>
    );
  }

  const item = listing.data;
  const isOwner = item.ownerId === user?.id;

  async function start(kind?: CallKind) {
    setError(null);
    setBusy(kind ?? 'chat');
    try {
      const conversation = await api.conversations.create({
        listingId: item.id,
        participantId: item.ownerId,
      });
      if (!kind) {
        router.push(`/chat/${conversation.id}` as Href);
        return;
      }
      const call = await api.calls.create({ conversationId: conversation.id, kind });
      router.push(`/call/${call.id}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start conversation');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: item.city }} />

      {item.images[0] ? (
        <Image source={{ uri: item.images[0] }} style={styles.cover} />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Text style={styles.coverLetter}>{item.title.slice(0, 1)}</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        {item.status !== 'ACTIVE' ? <Badge label={item.status} /> : null}
      </View>
      <Text style={styles.price}>{formatPrice(item.price)}</Text>
      <Text style={styles.meta}>
        {item.areaAcres} acres · {item.city}, {item.state}
      </Text>

      <Card>
        <Text style={styles.sectionTitle}>About this land</Text>
        <Text style={styles.description}>{item.description}</Text>
      </Card>

      <MapPreview
        latitude={item.latitude}
        longitude={item.longitude}
        label={`${item.address}, ${item.city}`}
      />

      <Card>
        <Text style={styles.sectionTitle}>Listed by</Text>
        <View style={styles.ownerRow}>
          <Avatar name={item.owner?.name ?? 'Owner'} uri={item.owner?.avatarUrl} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ownerName}>{item.owner?.name ?? 'Land owner'}</Text>
            <Text style={styles.ownerRole}>
              {item.owner?.role ? `${item.owner.role.toLowerCase()} · ` : ''}
              Contact stays inside the app
            </Text>
          </View>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isOwner ? (
        <Card>
          <Text style={styles.sectionTitle}>This is your listing</Text>
          <Text style={styles.meta}>Manage it from the My Listings tab.</Text>
        </Card>
      ) : (
        <View style={styles.actions}>
          <Button
            label="Message seller"
            onPress={() => start()}
            loading={busy === 'chat'}
          />
          <View style={styles.callRow}>
            <View style={styles.callButton}>
              <Button
                label="📞 Audio"
                variant="secondary"
                onPress={() => start('AUDIO')}
                loading={busy === 'AUDIO'}
              />
            </View>
            <View style={styles.callButton}>
              <Button
                label="📹 Video"
                variant="secondary"
                onPress={() => start('VIDEO')}
                loading={busy === 'VIDEO'}
              />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { width: '100%', height: 240 },
  coverPlaceholder: {
    height: 200,
    backgroundColor: colors.bubbleOut,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLetter: { fontSize: 64, fontWeight: '800', color: colors.primary },
  headerRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  price: { paddingHorizontal: spacing.lg, fontSize: 24, fontWeight: '800', color: colors.primary },
  meta: { paddingHorizontal: spacing.lg, fontSize: 14, color: colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, lineHeight: 22, color: colors.textMuted },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  ownerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  ownerRole: { fontSize: 13, color: colors.textMuted },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  callRow: { flexDirection: 'row', gap: spacing.md },
  callButton: { flex: 1 },
  error: { paddingHorizontal: spacing.lg, color: colors.danger, fontSize: 14 },
});
