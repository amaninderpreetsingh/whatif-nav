import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapboxGL from "@rnmapbox/maps";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useNavigationStore } from "@/stores/navigation-store";
import { RoutingService } from "@/services/routing/routing-service";
import { GoogleRouteProvider } from "@/services/routing/google-provider";
import { MapboxRouteProvider } from "@/services/routing/mapbox-provider";
import { AddressSearchInput } from "@/components/search/AddressSearchInput";
import { coordinatesToGeoJSON } from "@/utils/polyline";
import Toast from "react-native-toast-message";
import type { Coordinate, NormalizedRoute } from "@/services/routing/types";
import type { GeocodingResult } from "@/services/geocoding/types";
import { colors, radius, spacing, typography, shadows } from "@/theme";

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");

const routingService = new RoutingService(
  new GoogleRouteProvider(),
  new MapboxRouteProvider()
);

const DEFAULT_CENTER: Coordinate = { lat: 40.7128, lng: -74.006 };

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startNavigation = useNavigationStore((s) => s.startNavigation);

  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [origin, setOrigin] = useState<GeocodingResult | null>(null);
  const [destination, setDestination] = useState<GeocodingResult | null>(null);
  const [previewRoute, setPreviewRoute] = useState<NormalizedRoute | null>(null);
  const [calculating, setCalculating] = useState(false);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const cardSlide = useRef(new Animated.Value(200)).current;
  const goButtonScale = useRef(new Animated.Value(1)).current;

  // Get current location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "info",
          text1: "Location permission denied",
          text2: "Using New York as default location",
        });
        setCurrentLocation(DEFAULT_CENTER);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch {
        setCurrentLocation(DEFAULT_CENTER);
      }
    })();
  }, []);

  // Animate bottom card when preview route shows
  useEffect(() => {
    Animated.spring(cardSlide, {
      toValue: previewRoute ? 0 : 200,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [previewRoute]);

  // Effective origin coordinate: explicit override OR current GPS
  const effectiveOriginCoord: Coordinate | null =
    origin?.coordinate || currentLocation;

  // Fit camera to both points when route is set
  useEffect(() => {
    if (
      previewRoute &&
      effectiveOriginCoord &&
      destination &&
      cameraRef.current
    ) {
      const ne: [number, number] = [
        Math.max(effectiveOriginCoord.lng, destination.coordinate.lng),
        Math.max(effectiveOriginCoord.lat, destination.coordinate.lat),
      ];
      const sw: [number, number] = [
        Math.min(effectiveOriginCoord.lng, destination.coordinate.lng),
        Math.min(effectiveOriginCoord.lat, destination.coordinate.lat),
      ];
      cameraRef.current.fitBounds(ne, sw, [120, 80, 240, 80], 800);
    }
  }, [previewRoute]);

  // Recompute route whenever origin OR destination changes
  useEffect(() => {
    if (!effectiveOriginCoord || !destination) {
      setPreviewRoute(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCalculating(true);
      try {
        const route = await routingService.getRoute(
          effectiveOriginCoord,
          destination.coordinate
        );
        if (cancelled) return;
        setPreviewRoute(route);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err: any) {
        if (cancelled) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Toast.show({
          type: "error",
          text1: "Couldn't calculate route",
          text2: err.message,
        });
      } finally {
        if (!cancelled) setCalculating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveOriginCoord?.lat,
    effectiveOriginCoord?.lng,
    destination?.coordinate.lat,
    destination?.coordinate.lng,
  ]);

  const handleOriginSelect = (result: GeocodingResult) => {
    setOrigin(result);
  };

  const handleDestinationSelect = (result: GeocodingResult) => {
    if (!effectiveOriginCoord) {
      Toast.show({ type: "error", text1: "Waiting for location..." });
      return;
    }
    setDestination(result);
  };

  const handleClearOrigin = () => {
    Haptics.selectionAsync();
    setOrigin(null);
  };

  const handleClearDestination = () => {
    Haptics.selectionAsync();
    setDestination(null);
    setPreviewRoute(null);
  };

  const animateGoPress = (pressed: boolean) => {
    Animated.spring(goButtonScale, {
      toValue: pressed ? 0.96 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleStartRoute = () => {
    if (!previewRoute || !effectiveOriginCoord || !destination) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startNavigation(previewRoute, effectiveOriginCoord, destination.coordinate);
    router.push("/(main)/navigation");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const center = currentLocation || DEFAULT_CENTER;

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        compassEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={14}
          centerCoordinate={[center.lng, center.lat]}
          animationDuration={500}
        />

        {/* Current location pin */}
        {currentLocation && (
          <MapboxGL.PointAnnotation
            id="current-location"
            coordinate={[currentLocation.lng, currentLocation.lat]}
          >
            <View style={styles.currentPin} />
          </MapboxGL.PointAnnotation>
        )}

        {/* Destination pin */}
        {destination && (
          <MapboxGL.PointAnnotation
            id="destination"
            coordinate={[destination.coordinate.lng, destination.coordinate.lat]}
          >
            <View style={styles.destPin} />
          </MapboxGL.PointAnnotation>
        )}

        {/* Preview route */}
        {previewRoute && (
          <MapboxGL.ShapeSource
            id="preview-route"
            shape={{
              type: "Feature",
              geometry: coordinatesToGeoJSON(previewRoute.coordinates),
              properties: {},
            }}
          >
            <MapboxGL.LineLayer
              id="preview-route-glow"
              style={{
                lineColor: colors.accent,
                lineWidth: 14,
                lineCap: "round",
                lineJoin: "round",
                lineOpacity: 0.25,
                lineBlur: 6,
              }}
            />
            <MapboxGL.LineLayer
              id="preview-route-line"
              style={{
                lineColor: colors.accentBright,
                lineWidth: 6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      <LinearGradient
        colors={["rgba(10, 14, 26, 0.85)", "transparent"]}
        style={[styles.topFade, { height: insets.top + 200 }]}
        pointerEvents="none"
      />

      {/* Search inputs (From + To) — sits in safe area at top */}
      <View style={[styles.searchContainer, { top: insets.top + spacing.md }]}>
        <View style={styles.fromInputWrap}>
          <View style={styles.fromDot} />
          <View style={styles.fromInputInner}>
            <AddressSearchInput
              placeholder="Your location"
              proximity={currentLocation || undefined}
              onSelect={handleOriginSelect}
              initialValue={origin?.placeName ?? ""}
            />
          </View>
          {origin && (
            <Pressable
              onPress={handleClearOrigin}
              hitSlop={10}
              style={styles.miniClear}
            >
              <Text style={styles.miniClearText}>×</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.connector} />

        <View style={styles.toInputWrap}>
          <View style={styles.toFlag} />
          <View style={styles.toInputInner}>
            <AddressSearchInput
              placeholder="Where to?"
              proximity={effectiveOriginCoord || undefined}
              onSelect={handleDestinationSelect}
              initialValue={destination?.placeName ?? ""}
            />
          </View>
        </View>
      </View>

      {/* Side action chips */}
      <View style={[styles.sideActions, { top: insets.top + 180 }]}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(main)/saved-routes");
          }}
        >
          <BlurView
            intensity={50}
            tint="dark"
            style={[styles.chip, styles.chipBlur]}
          >
            <Text style={styles.chipText}>Saved</Text>
          </BlurView>
        </Pressable>
        <View style={{ height: spacing.sm }} />
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(main)/history");
          }}
        >
          <BlurView
            intensity={50}
            tint="dark"
            style={[styles.chip, styles.chipBlur]}
          >
            <Text style={styles.chipText}>History</Text>
          </BlurView>
        </Pressable>
        <View style={{ height: spacing.sm }} />
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(main)/settings");
          }}
        >
          <BlurView
            intensity={50}
            tint="dark"
            style={[styles.chip, styles.chipBlur]}
          >
            <Text style={styles.chipText}>Settings</Text>
          </BlurView>
        </Pressable>
      </View>

      {/* Bottom preview card */}
      {(destination || calculating) && (
        <Animated.View
          style={[
            styles.previewCard,
            {
              bottom: insets.bottom + spacing.xl,
              transform: [{ translateY: cardSlide }],
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.previewBlur}>
            <View style={styles.previewInner}>
              <View style={styles.previewHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLabel}>Destination</Text>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {destination?.text || "..."}
                  </Text>
                  {destination?.context && (
                    <Text style={styles.previewContext} numberOfLines={1}>
                      {destination.context}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={handleClearDestination}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.clearButtonPressed,
                  ]}
                >
                  <Text style={styles.clearText}>×</Text>
                </Pressable>
              </View>

              {previewRoute && (
                <View style={styles.previewStats}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>
                      {formatDuration(previewRoute.duration)}
                    </Text>
                    <Text style={styles.statLabel}>duration</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>
                      {formatDistance(previewRoute.distance)}
                    </Text>
                    <Text style={styles.statLabel}>distance</Text>
                  </View>
                </View>
              )}

              <Animated.View style={{ transform: [{ scale: goButtonScale }] }}>
                <Pressable
                  onPress={handleStartRoute}
                  onPressIn={() => animateGoPress(true)}
                  onPressOut={() => animateGoPress(false)}
                  disabled={calculating || !previewRoute}
                  style={styles.goButton}
                >
                  <LinearGradient
                    colors={
                      previewRoute
                        ? [colors.accentBright, colors.accent]
                        : [colors.bgSecondary, colors.bgSecondary]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.goGradient}
                  >
                    <Text
                      style={[
                        styles.goText,
                        !previewRoute && styles.goTextDim,
                      ]}
                    >
                      {calculating ? "Calculating..." : previewRoute ? "Start" : "..."}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  map: { flex: 1 },
  topFade: { position: "absolute", top: 0, left: 0, right: 0 },
  searchContainer: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  fromInputWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  toInputWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  fromDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textSecondary,
    borderWidth: 2,
    borderColor: colors.bgPrimary,
    marginRight: spacing.sm,
  },
  toFlag: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },
  fromInputInner: { flex: 1 },
  toInputInner: { flex: 1 },
  connector: {
    width: 2,
    height: 14,
    backgroundColor: colors.borderMedium,
    marginLeft: 4,
    marginVertical: 2,
  },
  miniClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  miniClearText: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  sideActions: { position: "absolute", right: spacing.lg },
  chip: {
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  chipBlur: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(20, 25, 40, 0.4)",
  },
  chipText: {
    fontFamily: typography.bodyMed,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  currentPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.textPrimary,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  destPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentBright,
    borderWidth: 3.5,
    borderColor: colors.textPrimary,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  previewCard: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.lg,
  },
  previewBlur: { overflow: "hidden" },
  previewInner: {
    padding: spacing.lg,
    backgroundColor: "rgba(20, 25, 40, 0.65)",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  previewLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  previewName: {
    fontFamily: typography.displayMed,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  previewContext: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.md,
  },
  clearButtonPressed: { backgroundColor: "rgba(148, 163, 184, 0.16)" },
  clearText: {
    fontFamily: typography.body,
    fontSize: 22,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  previewStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 25, 40, 0.45)",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statValue: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.accentBright,
    letterSpacing: -0.6,
  },
  statLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },
  goButton: {
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadows.glow,
  },
  goGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  goText: {
    fontFamily: typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  goTextDim: { color: colors.textTertiary },
});
