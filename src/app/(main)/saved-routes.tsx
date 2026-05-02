import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { getCurrentUser } from "@/services/firebase/auth";
import {
  getSavedRoutes,
  deleteSavedRoute,
  updateLastUsedAt,
} from "@/services/firebase/firestore";
import { useNavigationStore } from "@/stores/navigation-store";
import { RoutingService } from "@/services/routing/routing-service";
import { GoogleRouteProvider } from "@/services/routing/google-provider";
import { MapboxRouteProvider } from "@/services/routing/mapbox-provider";
import type { SavedRoute } from "@/services/routing/types";
import Toast from "react-native-toast-message";
import { colors, radius, spacing, typography, shadows } from "@/theme";

const routingService = new RoutingService(
  new GoogleRouteProvider(),
  new MapboxRouteProvider()
);

export default function SavedRoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const startNavigation = useNavigationStore((s) => s.startNavigation);

  useEffect(() => {
    if (!user) return;
    getSavedRoutes(user.uid)
      .then(setRoutes)
      .finally(() => setLoading(false));
  }, [user]);

  const handleNavigate = async (saved: SavedRoute) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const origin = { lat: saved.origin.lat, lng: saved.origin.lng };
      const dest = { lat: saved.destination.lat, lng: saved.destination.lng };
      const waypoints = saved.waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }));
      const route = await routingService.getRoute(
        origin, dest, waypoints.length > 0 ? waypoints : undefined
      );
      await updateLastUsedAt(saved.id);
      startNavigation(route, origin, dest);
      router.push("/(main)/navigation");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: "Failed to start route",
        text2: err.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteSavedRoute(id);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    Toast.show({ type: "success", text1: "Route deleted" });
  };

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.back();
        }}
        style={styles.backButton}
      >
        <Text style={styles.backIcon}>←</Text>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Saved Routes</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <View style={styles.emptyIconInner} />
          </View>
          <Text style={styles.emptyTitle}>No saved routes yet</Text>
          <Text style={styles.emptySubtitle}>
            Routes you save will appear here for quick access
          </Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleNavigate(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.routeName}>{item.name}</Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.deleteButtonPressed,
                  ]}
                >
                  <Text style={styles.deleteIcon}>×</Text>
                </Pressable>
              </View>

              <View style={styles.cardStats}>
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{formatTime(item.estimatedTime)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>
                    {(item.distance / 1000).toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>km</Text>
                </View>
              </View>

              <View style={styles.cardRoute}>
                <View style={styles.routeDot} />
                <Text style={styles.routeAddress} numberOfLines={1}>
                  {item.origin.address}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.cardRoute}>
                <View style={[styles.routeDot, styles.routeDotEnd]} />
                <Text style={styles.routeAddress} numberOfLines={1}>
                  {item.destination.address}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  backIcon: {
    fontFamily: typography.body,
    fontSize: 22,
    color: colors.accentBright,
    marginRight: spacing.sm,
  },
  backText: {
    fontFamily: typography.bodyMed,
    color: colors.accentBright,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.textPrimary,
    marginBottom: spacing.xxxl,
    letterSpacing: -1.2,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.bgElevated,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  emptyIconInner: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.textTertiary,
  },
  emptyTitle: {
    fontFamily: typography.displayMed,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    letterSpacing: -0.1,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardPressed: {
    backgroundColor: colors.bgSecondary,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  routeName: {
    flex: 1,
    fontFamily: typography.displayMed,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  deleteButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(148, 163, 184, 0.06)",
    justifyContent: "center", alignItems: "center",
  },
  deleteButtonPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  deleteIcon: {
    fontFamily: typography.body,
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  statBlock: { marginRight: spacing.xl },
  statValue: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.accentBright,
    letterSpacing: -0.6,
  },
  statLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
    marginRight: spacing.xl,
  },
  cardRoute: { flexDirection: "row", alignItems: "center" },
  routeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.textSecondary,
    marginRight: spacing.md,
  },
  routeDotEnd: { backgroundColor: colors.accent },
  routeAddress: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  routeLine: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderSubtle,
    marginLeft: 4,
    marginVertical: 4,
  },
});
