import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, type } from '@/lib/theme';

/**
 * Listing photography with an intentional fallback. Remote stock images are
 * illustrative; when one fails the card must still feel designed, not broken.
 */
export function ListingImage({
  uri,
  title,
  style,
  icon = 'leaf-outline',
}: {
  uri?: string | null;
  title: string;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, style]} accessible accessibilityLabel={`${title} image`}>
        <View style={styles.ringLarge} />
        <View style={styles.ringSmall} />
        <View style={styles.fallbackMark}>
          <Ionicons name={icon} size={26} color={colors.primary} />
          <Text style={styles.fallbackLetter}>{title.slice(0, 1).toUpperCase()}</Text>
        </View>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as StyleProp<ImageStyle>}
      contentFit="cover"
      transition={180}
      cachePolicy="memory-disk"
      onError={() => setFailed(true)}
      accessibilityLabel={`${title} photo`}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.imageFallback,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ringLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: colors.imageFallbackDeep,
    opacity: 0.7,
    top: -80,
    right: -70,
  },
  ringSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: colors.imageFallbackDeep,
    opacity: 0.5,
    bottom: -40,
    left: -30,
  },
  fallbackMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  fallbackLetter: {
    ...type.title,
    color: colors.primary,
  },
});
