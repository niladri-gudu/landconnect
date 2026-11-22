import { useRouter, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListingDto } from '@landconnect/shared';

import { colors, radius, shadow, spacing } from '@/lib/theme';

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ListingCard({ listing }: { listing: ListingDto }) {
  const router = useRouter();
  const cover = listing.images[0];

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{listing.title.slice(0, 1)}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{formatPrice(listing.price)}</Text>
        <Text style={styles.meta}>
          {listing.areaAcres} acres · {listing.city}, {listing.state}
        </Text>
        {listing.status !== 'ACTIVE' ? (
          <Text style={styles.status}>{listing.status.toLowerCase()}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 170 },
  placeholder: {
    height: 120,
    backgroundColor: colors.bubbleOut,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 40, fontWeight: '800', color: colors.primary },
  body: { padding: spacing.lg, gap: 4 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  price: { fontSize: 18, fontWeight: '800', color: colors.primary },
  meta: { fontSize: 13, color: colors.textMuted },
  status: { fontSize: 12, fontWeight: '700', color: colors.warning, textTransform: 'uppercase' },
});
