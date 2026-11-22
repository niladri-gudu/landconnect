# Maps and Geolocation

**Baseline:** 2026-11-21
**Status:** coordinates are captured and stored; the detail screen opens OpenStreetMap. No
embedded map or map picker yet.
**Related:** [PROPERTY_LISTINGS.md](PROPERTY_LISTINGS.md) · [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) · [TECH_STACK.md](TECH_STACK.md)

---

## 1. Requirements

| Requirement | Interpretation |
|---|---|
| Integrate map functionality | Show the plot on a map inside the app |
| Geotagging / location selection | Capture GPS or select a point when creating a listing |
| View property location | Buyer can inspect where the land is |

The brief does not require routing, directions or satellite imagery. A single marker on a vector
map plus a point picker is sufficient.

## 2. What exists today

### 2.1 Data

`Listing` stores `latitude` (Float) and `longitude` (Float), validated to valid ranges. Address,
city, state and country accompany the coordinates.

### 2.2 Capture — `apps/mobile/src/app/listing/create.tsx`

- Defaults: Bengaluru `12.9716, 77.5946`.
- Manual latitude/longitude fields.
- "📍 Use my current location":
  ```ts
  const permission = await Location.requestForegroundPermissionsAsync();
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  setLatitude(position.coords.latitude.toFixed(6));
  setLongitude(position.coords.longitude.toFixed(6));
  ```
- Permission denial shows: "Location permission was denied — enter coordinates manually."

### 2.3 Display — `apps/mobile/src/components/map-preview.tsx`

A pressable card with a pin, address, coordinates and "Open in OpenStreetMap →". It opens:

```
https://www.openstreetmap.org/?mlat=<lat>&mlon=<lng>#map=16/<lat>/<lng>
```

This is zero-dependency and works in Expo Go, but it leaves the app and is not an embedded map.

### 2.4 Permissions

`app.json` declares coarse and fine location for Android and an `expo-location` plugin message
for iOS. Foreground-only access; no background tracking.

## 3. Target: MapLibre + OpenFreeMap

**Choice:** `@maplibre/maplibre-react-native` with free OpenFreeMap vector tiles (no API key,
no paid Google Maps).

**Why:**
- Free and open; matches the assessment's no-paid-service constraint.
- Native vector rendering with smooth zoom.
- Works with standard `style.json` sources.
- OpenFreeMap is a free hosted tile service; OSM data powers it.
- It is the native counterpart to Leaflet (which is web-only).

**Cost:** a native module, so it requires a development/preview build — it cannot run in Expo Go.
This aligns with the calling work, which also needs a dev build.

## 4. Implementation plan

### 4.1 Install

```bash
cd apps/mobile
npx expo install @maplibre/maplibre-react-native
```

Add the config plugin if the package exposes one, or follow its Expo installation guide. Rebuild
the development client:

```bash
eas build --profile development --platform android
```

### 4.2 Map component

```tsx
// components/listing-map.tsx
import { Camera, MapView, PointAnnotation } from '@maplibre/maplibre-react-native';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function ListingMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapView style={{ flex: 1 }} styleURL={STYLE_URL}>
      <Camera centerCoordinate={[lng, lat]} zoomLevel={14} animationMode="flyTo" />
      <PointAnnotation id="plot" coordinate={[lng, lat]}>
        <View style={pinStyle} />
      </PointAnnotation>
    </MapView>
  );
}
```

Wrap it in a fixed-height card (220–260 px) on the listing detail screen. Keep the existing
"Open in OpenStreetMap" action as a secondary escape hatch.

### 4.3 Location picker (create screen)

```tsx
<MapView
  styleURL={STYLE_URL}
  onPress={(feature) => {
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  }}
>
  <Camera centerCoordinate={[Number(longitude), Number(latitude)]} zoomLevel={13} />
  <PointAnnotation id="picker" coordinate={[Number(longitude), Number(latitude)]}>
    <View style={pinStyle} />
  </PointAnnotation>
</MapView>
```

Add:
- A "Search address" geocoder (Nominatim, respecting its usage policy) — optional.
- A "Recenter to me" button calling `expo-location`.
- Keep manual lat/lng fields as a fallback.
- Show the selected coordinates under the map.

### 4.4 Reverse geocoding (optional)

Nominatim:
```
https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=<lat>&lon=<lng>
```
Rules: set a descriptive `User-Agent`/`Referer`, throttle to 1 request/second, cache results, and
do not use it for bulk geocoding. For a prototype, manual address entry is acceptable and avoids
the policy burden.

## 5. Service comparison

| Option | Cost | Key | Native module | Notes |
|---|---|---|---|---|
| MapLibre + OpenFreeMap | Free | No | Yes | **Chosen** |
| MapLibre + OSM raster tiles | Free | No | Yes | OSM tile usage policy limits apps; prefer hosted vector |
| Google Maps | Paid above credit | Yes | Yes | Excluded by preference |
| Apple Maps (iOS) | Free | No | Yes (native) | iOS-only |
| Leaflet in WebView | Free | No | No | Web-only; poor native feel |
| Static map image | Varies | Often | No | Not interactive; fallback only |
| OSM deep link (current) | Free | No | No | Leaves the app; ships today |

## 6. Fallback order

1. MapLibre embedded map (target).
2. If the native build fails: keep the OSM deep-link card (current) and state the limitation.
3. In the demo video, open the OSM link to prove the location is real even if embedded rendering
   is not ready.

Do not block the calling work for maps. Calling is the scored requirement; maps are secondary.

## 7. Permissions and platform notes

Android (`app.json`):
```
ACCESS_COARSE_LOCATION
ACCESS_FINE_LOCATION
```
iOS plugin message:
```
"LandConnect uses your location to tag land listings and show nearby properties."
```

Guidelines:
- Request foreground permission only when the user taps "Use my current location" (contextual).
- Never request background location.
- Handle denial without blocking manual coordinates.
- Add `CAMERA` only if a future "camera-as-map" feature needs it; not for maps.

## 8. Privacy

Exact coordinates can reveal a private residence or the owner's location. For this prototype,
listing coordinates are public (they describe the plot, not the person).

Production recommendations:
- Public feed shows an approximate pin (200–500 m offset or a city-level marker).
- Exact pin revealed after a conversation starts or owner approval.
- Per-listing "hide exact location" toggle.
- Never publish the device's live location — only the chosen listing coordinate.
- Document retention of location data.

See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) §5.

## 9. Testing

| Test | Expected |
|---|---|
| Create listing with GPS | Coordinates update to the device's position |
| Deny permission | Helpful message; manual entry still works |
| Enter invalid latitude (100) | Zod rejects with a field error |
| Open listing detail | Map shows a pin at the coordinates |
| Tap map card | OSM opens at the same point |
| Tap picker map | Coordinates update; marker moves |
| Rotate/resize | Map fills its card without layout break |
| Offline | Tiles fail gracefully; coordinates and address still shown |

## 10. Risks

| Risk | Mitigation |
|---|---|
| MapLibre incompatible with Expo 58/RN 0.88 | Test in the same dev build as WebRTC; keep the deep-link fallback |
| Tile provider rate limits | Use OpenFreeMap's published style; avoid bulk requests; cache |
| EAS build time | Bundle map work with the calling dev build |
| Android native config errors | Rebuild after adding the plugin; check logcat |
| Geocoding policy violations | Manual address by default; throttle Nominatim |

## 11. Definition of done

- [ ] Listing detail renders an embedded map with a marker.
- [ ] Create screen supports tapping the map to pick a location.
- [ ] GPS capture still works and handles denial.
- [ ] Coordinates remain validated server-side.
- [ ] Deep-link fallback retained.
- [ ] Screenshots captured for the demo/docs.
