import { useEffect, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { RouteOverlay } from "@/components/map/RouteOverlay";
import { NavigationBottomSheet } from "@/components/navigation/BottomSheet";
import { ConnectionBanner } from "@/components/common/ConnectionBanner";
import { useNavigationStore } from "@/stores/navigation-store";
import { useWhatIfStore } from "@/stores/whatif-store";
import { useConnectionStore } from "@/stores/connection-store";
import { RoutingService } from "@/services/routing/routing-service";
import { GoogleRouteProvider } from "@/services/routing/google-provider";
import { MapboxRouteProvider } from "@/services/routing/mapbox-provider";
import { LocationService } from "@/services/location/location-service";
import { insertWaypointAtCorrectPosition } from "@/utils/polyline";
import { debounce } from "@/utils/debounce";
import type { Coordinate, WhatIfWaypoint } from "@/services/routing/types";
import Toast from "react-native-toast-message";
import { colors } from "@/theme";

const routingService = new RoutingService(
  new GoogleRouteProvider(),
  new MapboxRouteProvider()
);
const locationService = new LocationService();

const MAX_WAYPOINTS = 25;

export default function NavigationScreen() {
  const router = useRouter();

  const activeRoute = useNavigationStore((s) => s.activeRoute);
  const origin = useNavigationStore((s) => s.origin);
  const destination = useNavigationStore((s) => s.destination);
  const currentPosition = useNavigationStore((s) => s.currentPosition);
  const updatePosition = useNavigationStore((s) => s.updatePosition);
  const updateETA = useNavigationStore((s) => s.updateETA);
  const replaceRoute = useNavigationStore((s) => s.replaceRoute);

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

  useEffect(() => {
    if (!activeRoute) return;

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
      });
    });

    return () => locationService.stopTracking();
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
      id: uuidv4(),
      coordinate: tappedPoint,
      label: `Point ${whatIfWaypoints.length + 1}`,
      addedAt: Date.now(),
      index: 0,
    };

    const updatedWaypoints = insertWaypointAtCorrectPosition(
      newWaypoint,
      whatIfWaypoints,
      activeRoute.coordinates
    );

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
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        onPress={handleMapPress}
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

        {/* What-if waypoint pins */}
        {whatIfWaypoints.map((wp) => (
          <MapboxGL.PointAnnotation
            key={wp.id}
            id={wp.id}
            coordinate={[wp.coordinate.lng, wp.coordinate.lat]}
          >
            <View style={styles.waypointPin}>
              <View style={styles.waypointPinInner} />
            </View>
          </MapboxGL.PointAnnotation>
        ))}

        {/* Current position */}
        {currentPosition && (
          <MapboxGL.PointAnnotation
            id="current-position"
            coordinate={[currentPosition.lng, currentPosition.lat]}
          >
            <View style={styles.currentPos}>
              <View style={styles.currentPosDot} />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      <ConnectionBanner />
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
    backgroundColor: "rgba(148, 163, 184, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(148, 163, 184, 0.6)",
  },
  waypointPinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#94A3B8",
  },
  currentPos: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  currentPosDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: colors.textPrimary,
  },
});
