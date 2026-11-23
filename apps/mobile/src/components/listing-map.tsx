import { Ionicons } from '@expo/vector-icons';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from 'react-native';

import { colors, radius, spacing, type } from '@/lib/theme';

import { MapPreview } from './map-preview';

type MapLibreModule = typeof import('@maplibre/maplibre-react-native');

/** Free vector tiles, no API key. Attribution is rendered by MapLibre. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

let cached: MapLibreModule | null | undefined;

/**
 * MapLibre is a native module. Resolving it lazily lets a development client
 * built before the map dependency keep running: callers fall back to the
 * schematic map card until the native build is installed.
 */
function mapLibre(): MapLibreModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = TurboModuleRegistry.get('MLRNMapViewModule')
      ? (require('@maplibre/maplibre-react-native') as MapLibreModule)
      : null;
  } catch {
    cached = null;
  }
  return cached;
}

function osmUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

function openOsm(latitude: number, longitude: number) {
  void Linking.openURL(osmUrl(latitude, longitude));
}

function Pin() {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pin}>
        <Ionicons name="home" size={15} color={colors.white} />
      </View>
      <View style={styles.pinTip} />
    </View>
  );
}

function MapFrame({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <View style={[styles.frame, { height }]}>
      {children}
      <View style={styles.frameBorder} pointerEvents="none" />
    </View>
  );
}

/**
 * Read-only map for the listing detail screen. Falls back to the schematic
 * card when the native MapLibre module is missing or the API returned
 * unusable coordinates.
 */
export function ListingMap({
  latitude,
  longitude,
  label,
  height = 210,
}: {
  latitude: number;
  longitude: number;
  label: string;
  height?: number;
}) {
  const ml = mapLibre();
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!ml || !valid) {
    return <MapPreview latitude={latitude} longitude={longitude} label={label} />;
  }

  const { Map, Camera, Marker } = ml;

  return (
    <View style={styles.block}>
      <MapFrame height={height}>
        <Map mapStyle={STYLE_URL} androidView="texture" style={styles.map}>
          <Camera initialViewState={{ center: [longitude, latitude], zoom: 14 }} />
          <Marker id="listing" lngLat={[longitude, latitude]} anchor="bottom">
            <Pin />
          </Marker>
        </Map>
      </MapFrame>
      <Pressable
        onPress={() => openOsm(latitude, longitude)}
        accessibilityRole="link"
        accessibilityLabel={`Open ${label} in OpenStreetMap`}
        android_ripple={{ color: colors.primarySoft }}
        style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="open-outline" size={15} color={colors.primary} />
        <Text style={styles.linkText}>Open in OpenStreetMap</Text>
        <Text style={styles.coords}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Tap-to-place map used when publishing a listing. The caller keeps the
 * latitude/longitude strings; the picker reports six-decimal WGS84 degrees.
 */
export function LocationPicker({
  latitude,
  longitude,
  onChange,
  height = 200,
}: {
  latitude: string;
  longitude: string;
  onChange: (latitude: string, longitude: string) => void;
  height?: number;
}) {
  const ml = mapLibre();
  const cameraRef = useRef<CameraRef>(null);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (!valid) return;
    cameraRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 600 });
  }, [lat, lng, valid]);

  if (!ml || !valid) return null;

  const { Map, Camera, Marker } = ml;

  return (
    <MapFrame height={height}>
      <Map
        mapStyle={STYLE_URL}
        androidView="texture"
        style={styles.map}
        onPress={(event) => {
          const [nextLng, nextLat] = event.nativeEvent.lngLat;
          onChange(nextLat.toFixed(6), nextLng.toFixed(6));
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: [lng, lat], zoom: 14 }}
        />
        <Marker id="picker" lngLat={[lng, lat]} anchor="bottom">
          <Pin />
        </Marker>
      </Map>
      <View style={styles.pickerHint} pointerEvents="none">
        <Ionicons name="hand-left-outline" size={13} color={colors.primaryDark} />
        <Text style={styles.pickerHintText}>Tap the map to move the pin</Text>
      </View>
    </MapFrame>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  pinWrap: { alignItems: 'center' },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    marginTop: -1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  linkText: { ...type.label, color: colors.primary },
  coords: { ...type.micro, color: colors.textFaint, marginLeft: 'auto' },
  pickerHint: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  pickerHintText: { ...type.micro, color: colors.primaryDark },
});
