import { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapboxGL from "@rnmapbox/maps";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useNavigationStore } from "@/stores/navigation-store";
import { RoutingService } from "@/services/routing/routing-service";
import { GoogleRouteProvider } from "@/services/routing/google-provider";
import { MapboxRouteProvider } from "@/services/routing/mapbox-provider";
import Toast from "react-native-toast-message";
import type { Coordinate } from "@/services/routing/types";
import { colors, radius, spacing, typography, shadows } from "@/theme";
import { DEFAULT_MAP_STYLE, DEFAULT_CAMERA } from "@/components/map/MapboxStyle";

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN || "");

const routingService = new RoutingService(
  new GoogleRouteProvider(),
  new MapboxRouteProvider()
);

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const startNavigation = useNavigationStore((s) => s.startNavigation);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const cardTranslateY = useRef(new Animated.Value(200)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const goButtonScale = useRef(new Animated.Value(1)).current;

  // Animate destination card in/out
  useEffect(() => {
    if (destination) {
      Animated.parallel([
        Animated.spring(cardTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 12,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(cardTranslateY, {
          toValue: 200,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [destination]);

  const handleMapPress = (event: any) => {
    const { geometry } = event;
    if (geometry?.coordinates) {
      const [lng, lat] = geometry.coordinates;
      Haptics.selectionAsync();
      setDestination({ lat, lng });
      setDestinationAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleStartRoute = async () => {
    if (!destination) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const origin: Coordinate = { lat: 40.7128, lng: -74.006 };
      const route = await routingService.getRoute(origin, destination);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      startNavigation(route, origin, destination);
      router.push("/(main)/navigation");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: "Could not calculate route",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const animateGoPress = (pressed: boolean) => {
    Animated.spring(goButtonScale, {
      toValue: pressed ? 0.96 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const clearDestination = () => {
    Haptics.selectionAsync();
    setDestination(null);
    setDestinationAddress("");
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={DEFAULT_MAP_STYLE}
        onPress={handleMapPress}
        compassEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={DEFAULT_CAMERA.zoomLevel}
          centerCoordinate={DEFAULT_CAMERA.centerCoordinate}
          animationDuration={DEFAULT_CAMERA.animationDuration}
        />

        {destination && (
          <MapboxGL.PointAnnotation
            id="destination"
            coordinate={[destination.lng, destination.lat]}
          >
            <View style={styles.markerOuter}>
              <View style={styles.markerMid}>
                <View style={styles.markerCore} />
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {/* Top fade gradient for status bar legibility */}
      <LinearGradient
        colors={["rgba(10, 14, 26, 0.85)", "transparent"]}
        style={[styles.topFade, { height: insets.top + 100 }]}
        pointerEvents="none"
      />

      {/* Floating glassmorphic search bar */}
      <View style={[styles.searchContainer, { top: insets.top + spacing.md }]}>
        <BlurView intensity={60} tint="dark" style={styles.searchBlur}>
          <View style={styles.searchInner}>
            <View style={styles.searchIcon}>
              <View style={styles.searchIconRing} />
              <View style={styles.searchIconHandle} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Where to?"
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </BlurView>
      </View>

      {/* Side action chips */}
      <View
        style={[
          styles.sideActions,
          { top: insets.top + 90 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            pressed && styles.chipPressed,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(main)/saved-routes");
          }}
        >
          <BlurView intensity={50} tint="dark" style={styles.chipBlur}>
            <Text style={styles.chipText}>Saved</Text>
          </BlurView>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.chip,
            pressed && styles.chipPressed,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(main)/settings");
          }}
        >
          <BlurView intensity={50} tint="dark" style={styles.chipBlur}>
            <Text style={styles.chipText}>Settings</Text>
          </BlurView>
        </Pressable>
      </View>

      {/* Destination card */}
      {destination && (
        <Animated.View
          style={[
            styles.destCard,
            {
              bottom: insets.bottom + spacing.xl,
              transform: [{ translateY: cardTranslateY }],
              opacity: cardOpacity,
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.destBlur}>
            <View style={styles.destInner}>
              <View style={styles.destInfo}>
                <Text style={styles.destLabel}>Destination</Text>
                <Text style={styles.destAddress}>{destinationAddress}</Text>
              </View>

              <View style={styles.destActions}>
                <Pressable
                  onPress={clearDestination}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.clearButtonPressed,
                  ]}
                >
                  <Text style={styles.clearText}>×</Text>
                </Pressable>

                <Animated.View style={{ transform: [{ scale: goButtonScale }] }}>
                  <Pressable
                    onPress={handleStartRoute}
                    onPressIn={() => animateGoPress(true)}
                    onPressOut={() => animateGoPress(false)}
                    disabled={loading}
                    style={styles.goButton}
                  >
                    <LinearGradient
                      colors={[colors.accentBright, colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.goGradient}
                    >
                      <Text style={styles.goText}>
                        {loading ? "..." : "Start"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
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
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  // Search bar (top, glassmorphic)
  searchContainer: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.md,
  },
  searchBlur: {
    overflow: "hidden",
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(20, 25, 40, 0.4)",
  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  searchIconRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: colors.textSecondary,
  },
  searchIconHandle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 6,
    height: 1.8,
    backgroundColor: colors.textSecondary,
    transform: [{ rotate: "45deg" }],
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  // Side action chips
  sideActions: {
    position: "absolute",
    right: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.sm,
  },
  chipPressed: { opacity: 0.7 },
  chipBlur: {
    overflow: "hidden",
  },
  chipText: {
    fontFamily: typography.bodyMed,
    fontSize: 13,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(20, 25, 40, 0.4)",
    letterSpacing: -0.1,
  },
  // Destination marker
  markerOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  markerMid: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  markerCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  // Destination card
  destCard: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.lg,
  },
  destBlur: {
    overflow: "hidden",
  },
  destInner: {
    padding: spacing.lg,
    backgroundColor: "rgba(20, 25, 40, 0.55)",
  },
  destInfo: {
    marginBottom: spacing.md,
  },
  destLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  destAddress: {
    fontFamily: typography.displayMed,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  destActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonPressed: {
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  clearText: {
    fontFamily: typography.body,
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  goButton: {
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadows.glow,
  },
  goGradient: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minWidth: 100,
    alignItems: "center",
  },
  goText: {
    fontFamily: typography.bodyBold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
});
