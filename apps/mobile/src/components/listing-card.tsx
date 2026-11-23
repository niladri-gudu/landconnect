import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListingDto } from '@landconnect/shared';

import { formatArea, formatPrice, roleLabel } from '@/lib/format';
import { colors, radius, spacing, type } from '@/lib/theme';
import { ListingImage } from './listing-image';
import { Avatar, Badge } from './ui';

const TWO_WEEKS_MS = 14 * 86_400_000;

export function ListingCard({
  listing,
  featured = false,
}: {
  listing: ListingDto;
  featured?: boolean;
}) {
  const router = useRouter();
  const owner = listing.owner;
  const isNew =
    listing.status === 'ACTIVE' &&
    Date.now() - new Date(listing.createdAt).getTime() < TWO_WEEKS_MS;

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}` as Href)}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}`}
      android_ripple={{ color: colors.surfaceAlt }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <ListingImage
          uri={listing.images[0]}
          title={listing.title}
          style={[styles.image, featured && styles.imageFeatured]}
        />
        {listing.status !== 'ACTIVE' ? (
          <Badge
            label={listing.status === 'SOLD' ? 'Sold' : 'Archived'}
            tone={listing.status === 'SOLD' ? 'warning' : 'neutral'}
            style={styles.imageBadge}
          />
        ) : isNew ? (
          <Badge label="New" tone="green" style={styles.imageBadge} />
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={[styles.price, featured && styles.priceFeatured]}>
            {formatPrice(listing.price)}
          </Text>
          <Text style={styles.perAcre}>{formatArea(listing.areaAcres)}</Text>
        </View>

        <Text numberOfLines={2} style={[styles.title, featured && styles.titleFeatured]}>
          {listing.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={colors.textMuted} />
          <Text numberOfLines={1} style={styles.meta}>
            {listing.city}, {listing.state}
          </Text>
        </View>

        {owner ? (
          <View style={styles.ownerRow}>
            <Avatar name={owner.name} uri={owner.avatarUrl} size={22} />
            <Text numberOfLines={1} style={styles.ownerName}>
              {owner.name}
            </Text>
            <Text style={styles.ownerRole}>· {roleLabel(owner.role)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.92 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 182 },
  imageFeatured: { height: 232 },
  imageBadge: { position: 'absolute', top: spacing.md, left: spacing.md },
  body: { padding: spacing.lg, gap: 6 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  price: { ...type.h2, fontSize: 19, color: colors.primary },
  priceFeatured: { fontSize: 22 },
  perAcre: { ...type.caption, color: colors.textMuted },
  title: { ...type.title, lineHeight: 23, color: colors.text },
  titleFeatured: { fontSize: 18, lineHeight: 25 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: { ...type.caption, color: colors.textMuted, flex: 1 },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ownerName: { ...type.caption, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  ownerRole: { ...type.caption, fontSize: 12, color: colors.textFaint },
});
