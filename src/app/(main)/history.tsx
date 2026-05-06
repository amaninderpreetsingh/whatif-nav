import { useEffect, useState } from "react";
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
import { getCurrentUser } from "@/services/firebase/auth";
import { getTripHistory } from "@/services/firebase/firestore";
import type {
  TripHistoryGroup,
  TripHistoryEntry,
} from "@/services/routing/types";
import { colors, radius, spacing, typography } from "@/theme";

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [groups, setGroups] = useState<TripHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    getTripHistory(user.uid)
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [user]);

  const toggleExpand = (routeKey: string) => {
    Haptics.selectionAsync();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(routeKey)) {
        next.delete(routeKey);
      } else {
        next.add(routeKey);
      }
      return next;
    });
  };

  const renderTrip = (trip: TripHistoryEntry) => {
    const vsEstimate = trip.duration - trip.estimatedDuration;
    const vsLabel =
      vsEstimate > 60
        ? `${Math.round(vsEstimate / 60)} min slower than estimate`
        : vsEstimate < -60
          ? `${Math.abs(Math.round(vsEstimate / 60))} min faster than estimate`
          : "matched estimate";
    return (
      <View key={trip.id} style={styles.tripRow}>
        <View style={styles.tripDot} />
        <View style={styles.tripInfo}>
          <Text style={styles.tripDateTime}>
            {formatDate(trip.startedAt)} · {formatTime(trip.startedAt)}
          </Text>
          <Text style={styles.tripDuration}>
            {formatDuration(trip.duration)}
          </Text>
          <Text style={styles.tripVs}>{vsLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xl },
      ]}
    >
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

      <Text style={styles.title}>History</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>
            Completed trips you save will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.routeKey}
          contentContainerStyle={{
            paddingBottom: insets.bottom + spacing.xxxl,
            paddingHorizontal: spacing.xl,
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item: group }) => {
            const isOpen = expanded.has(group.routeKey);
            return (
              <Pressable
                onPress={() => toggleExpand(group.routeKey)}
                style={({ pressed }) => [
                  styles.groupCard,
                  pressed && styles.groupCardPressed,
                ]}
              >
                <View style={styles.groupHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.groupRoute}>
                      <View style={styles.dotOrigin} />
                      <Text style={styles.groupAddress} numberOfLines={1}>
                        {group.originAddress}
                      </Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.groupRoute}>
                      <View style={styles.dotDest} />
                      <Text style={styles.groupAddress} numberOfLines={1}>
                        {group.destinationAddress}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tripCount}>{group.tripCount}×</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>
                      {formatDuration(group.averageDuration)}
                    </Text>
                    <Text style={styles.statLabel}>avg</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={[styles.statValue, { color: colors.success }]}>
                      {formatDuration(group.fastestDuration)}
                    </Text>
                    <Text style={styles.statLabel}>fastest</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBlock}>
                    <Text style={[styles.statValue, { color: colors.danger }]}>
                      {formatDuration(group.slowestDuration)}
                    </Text>
                    <Text style={styles.statLabel}>slowest</Text>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.tripList}>
                    {group.trips.map(renderTrip)}
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
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
  },
  title: {
    fontFamily: typography.display,
    fontSize: 36,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
    letterSpacing: -1.2,
  },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontFamily: typography.displayMed,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
  },
  groupCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  groupCardPressed: { backgroundColor: colors.bgSecondary },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  groupRoute: { flexDirection: "row", alignItems: "center" },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
    marginRight: spacing.md,
  },
  dotDest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.md,
  },
  routeLine: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderSubtle,
    marginLeft: 4,
    marginVertical: 2,
  },
  groupAddress: {
    flex: 1,
    fontFamily: typography.bodyMed,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  tripCount: {
    fontFamily: typography.bodyBold,
    fontSize: 13,
    color: colors.accentBright,
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginLeft: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 25, 40, 0.45)",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statValue: {
    fontFamily: typography.display,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.4,
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
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  tripList: { marginTop: spacing.lg },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  tripDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: spacing.md,
  },
  tripInfo: { flex: 1 },
  tripDateTime: {
    fontFamily: typography.bodyMed,
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  tripDuration: {
    fontFamily: typography.displayMed,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2,
  },
  tripVs: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
