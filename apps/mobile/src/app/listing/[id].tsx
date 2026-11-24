import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CallKind } from '@landconnect/shared';

import { ListingImage } from '@/components/listing-image';
import { ListingMap } from '@/components/listing-map';
import { StartingCall } from '@/components/starting-call';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  IconButton,
  Loading,
  SectionHeader,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ensureCallPermissions } from '@/lib/call-permissions';
import {
  formatArea,
  formatListedShort,
  formatPrice,
  formatPricePerAcre,
  roleLabel,
} from '@/lib/format';
import { colors, radius, spacing, type } from '@/lib/theme';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [imageIndex, setImageIndex] = useState(0);
  const [busy, setBusy] = useState<'chat' | CallKind | null>(null);
  const [startingCall, setStartingCall] = useState<CallKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tapping cancel while the permission prompt or API is still in flight must
  // not leave a ringing call behind.
  const cancelCallRef = useRef(false);

  const listing = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listings.get(id),
    enabled: Boolean(id),
  });

  if (listing.isLoading) return <Loading />;
  if (listing.error || !listing.data) {
    return (
      <View style={styles.center}>
        <ErrorState
          message={listing.error instanceof Error ? listing.error.message : undefined}
          onRetry={() => {
            void listing.refetch();
          }}
        />
      </View>
    );
  }

  const item = listing.data;
  const isOwner = item.ownerId === user?.id;
  const images = item.images.length > 0 ? item.images : [null];
  const imageHeight = Math.round(width * 0.74);

  async function start(kind?: CallKind) {
    setError(null);
    setBusy(kind ?? 'chat');

    // Put the call screen on top immediately. Permission prompts and API
    // round-trips can take seconds; the listing must not look frozen.
    if (kind) {
      cancelCallRef.current = false;
      setStartingCall(kind);
    }

    let opened = false;
    try {
      if (kind) {
        // Conversation creation does not depend on the permission answer, so
        // warm it while the system microphone/camera prompt is open.
        const conversationPromise = api.conversations.create({
          listingId: item.id,
          participantId: item.ownerId,
        });
        conversationPromise.catch(() => undefined);

        const allowed = await ensureCallPermissions(kind);
        if (!allowed) {
          if (!cancelCallRef.current) {
            setError(
              kind === 'VIDEO'
                ? 'Microphone and camera access are required for video calls. Allow them in Settings, then try again.'
                : 'Microphone access is required for calls. Allow it in Settings, then try again.',
            );
          }
          return;
        }
        if (cancelCallRef.current) return;

        const conversation = await conversationPromise;
        if (cancelCallRef.current) return;

        const call = await api.calls.create({ conversationId: conversation.id, kind });
        // Seed the route's query so the call screen renders the ringing UI
        // straight away instead of showing another spinner.
        queryClient.setQueryData(['call', call.id], call);

        if (cancelCallRef.current) {
          void api.calls.end(call.id).catch(() => undefined);
          return;
        }

        opened = true;
        router.push(`/call/${call.id}` as Href);
        // Dismiss the setup overlay now that the call screen is being pushed.
        setStartingCall(null);
        return;
      }

      const conversation = await api.conversations.create({
        listingId: item.id,
        participantId: item.ownerId,
      });
      router.push(`/chat/${conversation.id}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start conversation');
    } finally {
      setBusy(null);
      if (!opened) setStartingCall(null);
    }
  }

  function cancelStartingCall() {
    cancelCallRef.current = true;
    setBusy(null);
    setStartingCall(null);
  }

  const pricePerAcre = formatPricePerAcre(item.price, item.areaAcres);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isOwner ? spacing.xxxl : 116 + insets.bottom }}
      >
        <View>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => String(index)}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / width);
              setImageIndex(next);
            }}
            renderItem={({ item: image }) => (
              <ListingImage
                uri={image}
                title={item.title}
                style={{ width, height: imageHeight }}
              />
            )}
          />

          <View style={[styles.imageScrim, { height: insets.top + 64 }]} pointerEvents="none" />

          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={({ pressed }) => [
              styles.backButton,
              { top: insets.top + spacing.sm },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          {images.length > 1 ? (
            <View style={styles.dots} pointerEvents="none">
              {images.map((_, index) => (
                <View
                  key={String(index)}
                  style={[styles.dot, index === imageIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleBlock}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
              {item.status !== 'ACTIVE' ? (
                <Badge label={item.status === 'SOLD' ? 'Sold' : 'Archived'} tone="warning" />
              ) : null}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.locationText}>
                {item.city}, {item.state}
              </Text>
            </View>
          </View>

          <Card style={styles.statsCard}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Area</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatArea(item.areaAcres)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Per acre</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {pricePerAcre ?? '—'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>Listed</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatListedShort(item.createdAt)}
              </Text>
            </View>
          </Card>

          {isOwner ? (
            <Card style={styles.ownerNote}>
              <View style={styles.ownerNoteRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.ownerNoteTitle}>This is your listing</Text>
              </View>
              <Text style={styles.ownerNoteBody}>
                Buyers reach you through LandConnect chat and calls. Your phone number is never
                shown.
              </Text>
              <Button
                label="Manage in My Listings"
                icon="business-outline"
                variant="tonal"
                size="small"
                onPress={() => router.push('/(tabs)/listings' as Href)}
              />
            </Card>
          ) : item.owner ? (
            <Card>
              <View style={styles.ownerRow}>
                <Avatar name={item.owner.name} uri={item.owner.avatarUrl} size={48} />
                <View style={styles.ownerCopy}>
                  <Text style={styles.ownerName}>{item.owner.name}</Text>
                  <Text style={styles.ownerMeta}>
                    {roleLabel(item.owner.role)} · Contact stays in the app
                  </Text>
                </View>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textFaint} />
              </View>
            </Card>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="About this land" />
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="map-outline" size={16} color={colors.textMuted} />
              <Text style={styles.address}>{item.address}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Location" />
            <ListingMap
              latitude={item.latitude}
              longitude={item.longitude}
              label={`${item.address}, ${item.city}`}
            />
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {!isOwner ? (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.actionRow}>
            <IconButton
              name="call-outline"
              onPress={() => start('AUDIO')}
              accessibilityLabel="Start audio call"
              variant="outline"
              size={50}
              disabled={busy !== null}
            />
            <IconButton
              name="videocam-outline"
              onPress={() => start('VIDEO')}
              accessibilityLabel="Start video call"
              variant="outline"
              size={50}
              disabled={busy !== null}
            />
            <View style={styles.messageButton}>
              <Button
                label="Message seller"
                icon="chatbubble-ellipses-outline"
                onPress={() => start()}
                loading={busy === 'chat'}
              />
            </View>
          </View>
        </View>
      ) : null}

      <StartingCall
        visible={startingCall !== null}
        kind={startingCall ?? 'AUDIO'}
        name={item.owner?.name ?? 'LandConnect member'}
        role={item.owner ? roleLabel(item.owner.role) : ''}
        avatarUrl={item.owner?.avatarUrl ?? null}
        onCancel={cancelStartingCall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center' },
  imageScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 18, 14, 0.28)',
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.xxxl + spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: { backgroundColor: colors.white, width: 18 },
  sheet: {
    marginTop: -spacing.xxl,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  titleBlock: { gap: spacing.sm },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  price: { ...type.display, color: colors.primary },
  title: { ...type.h1, fontSize: 23, lineHeight: 30, color: colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { ...type.body, color: colors.textMuted },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 0,
  },
  statCell: { flex: 1, paddingHorizontal: spacing.sm, gap: 4 },
  statLabel: { ...type.micro, color: colors.textMuted, textTransform: 'uppercase' },
  statValue: { ...type.bodyStrong, fontSize: 14, color: colors.text },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ownerCopy: { flex: 1, gap: 2 },
  ownerName: { ...type.title },
  ownerMeta: { ...type.caption, color: colors.textMuted },
  ownerNote: { gap: spacing.sm },
  ownerNoteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ownerNoteTitle: { ...type.title },
  ownerNoteBody: { ...type.caption, color: colors.textMuted, lineHeight: 19 },
  section: { gap: spacing.md },
  description: { ...type.body, color: colors.textMuted },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  address: { ...type.caption, color: colors.textMuted, flex: 1, lineHeight: 19 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  messageButton: { flex: 1 },
});
