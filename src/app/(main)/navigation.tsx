import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapboxGL from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { RouteOverlay } from "@/components/map/RouteOverlay";
import { ManeuverMarker } from "@/components/map/ManeuverMarker";
import { NavigationBottomSheet } from "@/components/navigation/BottomSheet";
import { ConnectionBanner } from "@/components/common/ConnectionBanner";
import { useNavigationStore } from "@/stores/navigation-store";
import { useWhatIfStore } from "@/stores/whatif-store";
import { useConnectionStore } from "@/stores/connection-store";
import { RoutingService } from "@/services/routing/routing-service";
import { GoogleRouteProvider } from "@/services/routing/google-provider";
import { MapboxRouteProvider } from "@/services/routing/mapbox-provider";
import { LocationService } from "@/services/location/location-service";
import { debounce } from "@/utils/debounce";
import type { Coordinate, Step, WhatIfWaypoint } from "@/services/routing/types";
import { getCurrentUser } from "@/services/firebase/auth";
import { saveTripToHistory } from "@/services/firebase/firestore";
import Toast from "react-native-toast-message";
import { colors, typography } from "@/theme";

const routingService = new RoutingService(
  new GoogleRouteProvider(),
  new MapboxRouteProvider()
);
const locationService = new LocationService();

const MAX_WAYPOINTS = 25;
const MAX_VISIBLE_MARKERS = 25;
const MARKER_TYPES_SHOWN = ["turn", "exit", "ramp", "fork", "merge", "roundabout"];

interface VisibleBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function isCoordInBounds(
  coord: { lat: number; lng: number },
  bounds: VisibleBounds
): boolean {
  return (
    coord.lat >= bounds.minLat &&
    coord.lat <= bounds.maxLat &&
    coord.lng >= bounds.minLng &&
    coord.lng <= bounds.maxLng
  );
}

export default function NavigationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeRoute = useNavigationStore((s) => s.activeRoute);
  const origin = useNavigationStore((s) => s.origin);
  const destination = useNavigationStore((s) => s.destination);
  const currentPosition = useNavigationStore((s) => s.currentPosition);
  const updatePosition = useNavigationStore((s) => s.updatePosition);
  const updateETA = useNavigationStore((s) => s.updateETA);
  const replaceRoute = useNavigationStore((s) => s.replaceRoute);
  const stopNavigation = useNavigationStore((s) => s.stopNavigation);

  const isWhatIfActive = useWhatIfStore((s) => s.isActive);
  const whatIfWaypoints = useWhatIfStore((s) => s.waypoints);
  const modifiedRoute = useWhatIfStore((s) => s.modifiedRoute);
  const startWhatIf = useWhatIfStore((s) => s.startSession);
  const endWhatIf = useWhatIfStore((s) => s.endSession);
  const setWaypoints = useWhatIfStore((s) => s.setWaypoints);
  const setModifiedRoute = useWhatIfStore((s) => s.setModifiedRoute);
  const removeWaypoint = useWhatIfStore((s) => s.removeWaypoint);
  const undoLast = useWhatIfStore((s) => s.undoLast);

  const isWhatIfEnabled = useConnectionStore((s) => s.isWhatIfEnabled());

  const mapRef = useRef<MapboxGL.MapView | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<VisibleBounds | null>(null);
  const boundsUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arrivalPromptShown, setArrivalPromptShown] = useState(false);
  const arrivalPromptShownRef = useRef(false);

  const allManeuverSteps = useMemo(() => {
    if (!activeRoute) return [];
    return activeRoute.legs.flatMap((leg) =>
      leg.steps.filter((step) =>
        MARKER_TYPES_SHOWN.includes(step.maneuverType)
      )
    );
  }, [activeRoute]);

  const visibleSteps = useMemo(() => {
    if (allManeuverSteps.length === 0) return [];
    if (!visibleBounds) {
      return allManeuverSteps.slice(0, MAX_VISIBLE_MARKERS);
    }
    const filtered = allManeuverSteps.filter((step) =>
      isCoordInBounds(step.coordinate, visibleBounds)
    );
    return filtered.slice(0, MAX_VISIBLE_MARKERS);
  }, [allManeuverSteps, visibleBounds]);

  const handleCameraChanged = useCallback(async () => {
    if (boundsUpdateTimer.current) clearTimeout(boundsUpdateTimer.current);
    boundsUpdateTimer.current = setTimeout(async () => {
      try {
        if (!mapRef.current) return;
        const bounds = await mapRef.current.getVisibleBounds();
        if (!bounds || bounds.length < 2) return;
        const [ne, sw] = bounds;
        setVisibleBounds({
          minLat: Math.min(ne[1], sw[1]),
          maxLat: Math.max(ne[1], sw[1]),
          minLng: Math.min(ne[0], sw[0]),
          maxLng: Math.max(ne[0], sw[0]),
        });
      } catch {
        // ignore — map may not be fully ready
      }
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (boundsUpdateTimer.current) clearTimeout(boundsUpdateTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!activeRoute) return;

    setArrivalPromptShown(false);
    arrivalPromptShownRef.current = false;

    locationService.requestPermissions().then((granted) => {
      if (!granted) {
        Toast.show({ type: "error", text1: "Location permission required" });
        return;
      }
      locationService.startTracking(activeRoute.coordinates, (update) => {
        updatePosition(update.snapped);
        const remainingFraction = 1 - update.progress;
        updateETA(Math.round(activeRoute.duration * remainingFraction));

        if (update.routeState === "OFF_ROUTE") {
          handleReroute(update.snapped);
        }

        // Auto-arrival: progress > 98% AND remaining distance is short
        if (
          !arrivalPromptShownRef.current &&
          update.progress >= 0.98 &&
          activeRoute.distance * (1 - update.progress) < 50
        ) {
          arrivalPromptShownRef.current = true;
          setArrivalPromptShown(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("You've arrived", "Save this trip to history?", [
            {
              text: "Skip",
              onPress: () => finishTrip(true, false),
            },
            {
              text: "Save",
              onPress: () => finishTrip(true, true),
            },
          ]);
        }
      });
    });

    return () => {
      locationService.stopTracking();
      arrivalPromptShownRef.current = false;
      setArrivalPromptShown(false);
    };
  }, [activeRoute]);

  const handleReroute = async (position: Coordinate) => {
    if (!destination) return;
    try {
      const aheadWaypoints = isWhatIfActive
        ? whatIfWaypoints.map((wp) => wp.coordinate)
        : undefined;
      const newRoute = await routingService.getRoute(
        position,
        destination,
        aheadWaypoints
      );
      replaceRoute(newRoute);
      locationService.updatePolyline(newRoute.coordinates);
      Toast.show({ type: "info", text1: "Rerouting..." });
    } catch {
      // keep current route
    }
  };

  const debouncedRecalculate = useCallback(
    debounce(async (waypoints: WhatIfWaypoint[]) => {
      if (!currentPosition || !destination) return;
      try {
        const wpCoords = waypoints.map((wp) => wp.coordinate);
        const route = await routingService.getRoute(
          currentPosition,
          destination,
          wpCoords
        );
        setModifiedRoute(route);
      } catch (err: any) {
        if (err.message !== "Request cancelled") {
          Toast.show({
            type: "error",
            text1: "Couldn't calculate route",
          });
        }
      }
    }, 300),
    [currentPosition, destination]
  );

  const handleMapPress = (event: any) => {
    if (!isWhatIfEnabled || !activeRoute) return;

    const { geometry } = event;
    if (!geometry?.coordinates) return;
    const [lng, lat] = geometry.coordinates;
    const tappedPoint: Coordinate = { lat, lng };

    if (!isWhatIfActive) {
      startWhatIf(activeRoute);
    }

    if (whatIfWaypoints.length >= MAX_WAYPOINTS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({
        type: "error",
        text1: "Maximum route points reached",
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newWaypoint: WhatIfWaypoint = {
      id: Crypto.randomUUID(),
      coordinate: tappedPoint,
      label: `Point ${whatIfWaypoints.length + 1}`,
      addedAt: Date.now(),
      index: whatIfWaypoints.length,
    };

    // Append in tap order (not geographic) so the user-defined sequence is honored
    const updatedWaypoints = [...whatIfWaypoints, newWaypoint];

    setWaypoints(updatedWaypoints);
    debouncedRecalculate(updatedWaypoints);
  };

  const handleStepPress = (step: Step) => {
    if (!isWhatIfEnabled || !activeRoute) return;

    // Toggle: if this step is already a waypoint, REMOVE it
    const existingIndex = whatIfWaypoints.findIndex((wp) => wp.id === step.id);
    if (existingIndex !== -1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = whatIfWaypoints
        .filter((wp) => wp.id !== step.id)
        .map((wp, i) => ({ ...wp, index: i }));
      setWaypoints(updated);
      if (updated.length === 0) {
        endWhatIf();
      } else {
        debouncedRecalculate(updated);
      }
      return;
    }

    if (!isWhatIfActive) {
      startWhatIf(activeRoute);
    }

    if (whatIfWaypoints.length >= MAX_WAYPOINTS) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({
        type: "error",
        text1: "Maximum route points reached",
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newWaypoint: WhatIfWaypoint = {
      id: step.id,
      coordinate: step.coordinate,
      label: step.instruction || `${step.maneuverType} ${step.modifier}`.trim(),
      addedAt: Date.now(),
      index: whatIfWaypoints.length,
    };

    // Append in tap order so the route follows the user-defined sequence
    const updatedWaypoints = [...whatIfWaypoints, newWaypoint];

    setWaypoints(updatedWaypoints);
    debouncedRecalculate(updatedWaypoints);
  };

  const handleAcceptRoute = () => {
    if (!modifiedRoute) return;
    Alert.alert(
      "Accept modified route?",
      "This will replace your current route. You cannot undo this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            replaceRoute(modifiedRoute);
            locationService.updatePolyline(modifiedRoute.coordinates);
            endWhatIf();
          },
        },
      ]
    );
  };

  const handleDiscardChanges = () => {
    endWhatIf();
  };

  const handleUndoLast = () => {
    undoLast();
    const remaining = useWhatIfStore.getState().waypoints;
    if (remaining.length === 0) {
      endWhatIf();
    } else {
      debouncedRecalculate(remaining);
    }
  };

  const handleRemoveWaypoint = (id: string) => {
    removeWaypoint(id);
    const remaining = useWhatIfStore.getState().waypoints;
    if (remaining.length === 0) {
      endWhatIf();
    } else {
      debouncedRecalculate(remaining);
    }
  };

  const finishTrip = async (arrived: boolean, saveToHistory: boolean) => {
    const startedAt = useNavigationStore.getState().startedAt;
    const endedAt = Date.now();

    if (saveToHistory && startedAt && origin && destination && activeRoute) {
      const user = getCurrentUser();
      if (user) {
        try {
          await saveTripToHistory({
            userId: user.uid,
            origin: {
              lat: origin.lat,
              lng: origin.lng,
              address: `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
            },
            destination: {
              lat: destination.lat,
              lng: destination.lng,
              address: `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`,
            },
            startedAt,
            endedAt,
            duration: Math.round((endedAt - startedAt) / 1000),
            distance: activeRoute.distance,
            estimatedDuration: activeRoute.duration,
            waypoints: useWhatIfStore.getState().waypoints.map((wp) => ({
              lat: wp.coordinate.lat,
              lng: wp.coordinate.lng,
              label: wp.label,
            })),
            arrivedAtDestination: arrived,
          });
          Toast.show({ type: "success", text1: "Trip saved to history" });
        } catch (err: any) {
          Toast.show({
            type: "error",
            text1: "Failed to save trip",
            text2: err?.message,
          });
        }
      }
    }

    locationService.stopTracking();
    endWhatIf();
    stopNavigation();
    router.replace("/(main)");
  };

  const handleEndRoute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("End trip?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "End without saving",
        style: "destructive",
        onPress: () => {
          finishTrip(false, false);
        },
      },
      {
        text: "Save & end",
        onPress: () => {
          finishTrip(false, true);
        },
      },
    ]);
  };

  if (!activeRoute) {
    router.back();
    return null;
  }

  const centerCoord = currentPosition
    ? [currentPosition.lng, currentPosition.lat]
    : [activeRoute.coordinates[0].lng, activeRoute.coordinates[0].lat];

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        onPress={handleMapPress}
        onCameraChanged={handleCameraChanged}
        onDidFinishLoadingMap={handleCameraChanged}
        compassEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
      >
        <MapboxGL.Camera
          zoomLevel={15}
          centerCoordinate={centerCoord}
          followUserLocation={!isWhatIfActive}
          animationDuration={500}
        />

        <RouteOverlay
          activeRoute={activeRoute.coordinates}
          modifiedRoute={modifiedRoute?.coordinates}
        />

        {/* Tappable maneuver markers — only render those in the visible viewport */}
        {visibleSteps.map((step) => {
          const orderIndex = whatIfWaypoints.findIndex(
            (wp) => wp.id === step.id
          );
          return (
            <ManeuverMarker
              key={step.id}
              step={step}
              onPress={handleStepPress}
              highlighted={orderIndex !== -1}
              order={orderIndex !== -1 ? orderIndex + 1 : undefined}
            />
          );
        })}

        {/* What-if waypoint pins for empty-map taps (maneuver markers handle their own numbering) */}
        {whatIfWaypoints
          .filter(
            (wp) =>
              !allManeuverSteps.some((step) => step.id === wp.id)
          )
          .map((wp) => {
            const order = whatIfWaypoints.findIndex((w) => w.id === wp.id) + 1;
            return (
              <MapboxGL.PointAnnotation
                key={wp.id}
                id={wp.id}
                coordinate={[wp.coordinate.lng, wp.coordinate.lat]}
                onSelected={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleRemoveWaypoint(wp.id);
                }}
              >
                <View style={styles.waypointPin}>
                  <Text style={styles.waypointPinText}>{order}</Text>
                </View>
              </MapboxGL.PointAnnotation>
            );
          })}

        {/* Current position */}
        {currentPosition && (
          <MapboxGL.PointAnnotation
            id="current-position"
            coordinate={[currentPosition.lng, currentPosition.lat]}
          >
            <View style={styles.currentPos} />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      <ConnectionBanner />

      {/* End Route — top-left floating button */}
      <View
        style={[
          styles.endRouteWrapper,
          { top: insets.top + 12, left: 16 },
        ]}
      >
        <Pressable
          onPress={handleEndRoute}
          style={({ pressed }) => [
            styles.endRouteButton,
            pressed && styles.endRouteButtonPressed,
          ]}
        >
          <BlurView
            intensity={70}
            tint="dark"
            style={styles.endRouteBlur}
          >
            <Text style={styles.endRouteIcon}>×</Text>
            <Text style={styles.endRouteLabel}>End</Text>
          </BlurView>
        </Pressable>
      </View>

      <NavigationBottomSheet
        onAcceptRoute={handleAcceptRoute}
        onDiscardChanges={handleDiscardChanges}
        onUndoLast={handleUndoLast}
        onRemoveWaypoint={handleRemoveWaypoint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  map: { flex: 1 },
  waypointPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentBright,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  waypointPinText: {
    fontFamily: typography.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 14,
    textAlign: "center",
  },
  endRouteWrapper: {
    position: "absolute",
    zIndex: 50,
  },
  endRouteButton: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  endRouteButtonPressed: {
    opacity: 0.85,
  },
  endRouteBlur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(20, 25, 40, 0.55)",
  },
  endRouteIcon: {
    fontFamily: typography.body,
    fontSize: 20,
    lineHeight: 22,
    color: colors.danger,
    marginRight: 6,
    fontWeight: "600",
  },
  endRouteLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  currentPos: {
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
});
