import { useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import GorhomBottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ComparisonBar } from "./ComparisonBar";
import { useWhatIfStore } from "@/stores/whatif-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useConnectionStore } from "@/stores/connection-store";
import { colors, radius, spacing, typography, shadows } from "@/theme";

interface Props {
  onAcceptRoute: () => void;
  onDiscardChanges: () => void;
  onUndoLast: () => void;
  onRemoveWaypoint: (id: string) => void;
}

export function NavigationBottomSheet({
  onAcceptRoute,
  onDiscardChanges,
  onUndoLast,
  onRemoveWaypoint,
}: Props) {
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const snapPoints = useMemo(() => ["18%", "45%", "85%"], []);

  const remainingDuration = useNavigationStore((s) => s.remainingDuration);
  const remainingDistance = useNavigationStore((s) => s.remainingDistance);

  const isWhatIfActive = useWhatIfStore((s) => s.isActive);
  const originalRoute = useWhatIfStore((s) => s.originalRoute);
  const modifiedRoute = useWhatIfStore((s) => s.modifiedRoute);
  const waypoints = useWhatIfStore((s) => s.waypoints);

  const isWhatIfEnabled = useConnectionStore((s) => s.isWhatIfEnabled());

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}`;
  };

  const formatTimeUnit = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return mins < 60 ? "min" : "";
  };

  const tapHaptic = () => Haptics.selectionAsync();

  return (
    <GorhomBottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      handleStyle={styles.handleContainer}
    >
      <BottomSheetView style={styles.content}>
        {/* ETA hero */}
        <View style={styles.etaRow}>
          <View style={styles.etaBlock}>
            <Text style={styles.etaValue}>{formatTime(remainingDuration)}</Text>
            <Text style={styles.etaUnit}>{formatTimeUnit(remainingDuration)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.distanceBlock}>
            <Text style={styles.distanceLabel}>distance</Text>
            <Text style={styles.distanceValue}>
              {formatDistance(remainingDistance)}
            </Text>
          </View>
        </View>

        {/* Comparison bar (only when what-if active) */}
        {isWhatIfActive && originalRoute && modifiedRoute && (
          <ComparisonBar
            originalDuration={originalRoute.duration}
            modifiedDuration={modifiedRoute.duration}
          />
        )}

        {/* What-if waypoint list */}
        {isWhatIfActive && waypoints.length > 0 && (
          <ScrollView style={styles.waypointList}>
            <Text style={styles.sectionLabel}>Your detours</Text>
            {waypoints.map((wp) => (
              <View key={wp.id} style={styles.waypointRow}>
                <View style={styles.waypointIndex}>
                  <Text style={styles.waypointIndexText}>{wp.index + 1}</Text>
                </View>
                <Text style={styles.waypointLabel}>{wp.label}</Text>
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    onRemoveWaypoint(wp.id);
                  }}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && styles.removeButtonPressed,
                  ]}
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        {/* What-if action buttons */}
        {isWhatIfActive && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                tapHaptic();
                onUndoLast();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryText}>Undo</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                tapHaptic();
                onDiscardChanges();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryText}>Discard</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAcceptRoute();
              }}
              style={styles.acceptButton}
            >
              <LinearGradient
                colors={[colors.accentBright, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.acceptGradient}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Helper hint */}
        {!isWhatIfActive && isWhatIfEnabled && (
          <Text style={styles.hint}>
            Tap anywhere on the map to explore detours
          </Text>
        )}

        {!isWhatIfEnabled && (
          <Text style={[styles.hint, { color: colors.warning }]}>
            What-if exploration unavailable (limited connectivity)
          </Text>
        )}
      </BottomSheetView>
    </GorhomBottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderColor: colors.borderMedium,
  },
  handleContainer: { paddingTop: spacing.sm },
  handle: {
    backgroundColor: colors.textTertiary,
    width: 40,
    height: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  etaBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  etaValue: {
    fontFamily: typography.display,
    fontSize: 44,
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  etaUnit: {
    fontFamily: typography.bodyMed,
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    letterSpacing: -0.2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderMedium,
    marginHorizontal: spacing.xl,
  },
  distanceBlock: { flex: 1 },
  distanceLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  distanceValue: {
    fontFamily: typography.displayMed,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  waypointList: {
    maxHeight: 240,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  waypointRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  waypointIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  waypointIndexText: {
    fontFamily: typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 11,
  },
  waypointLabel: {
    flex: 1,
    fontFamily: typography.bodyMed,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(148, 163, 184, 0.06)",
  },
  removeButtonPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  removeText: {
    fontFamily: typography.body,
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.bgPrimary,
  },
  secondaryText: {
    fontFamily: typography.bodyMed,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  acceptButton: {
    flex: 1,
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadows.glow,
  },
  acceptGradient: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  acceptText: {
    fontFamily: typography.bodyBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  hint: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: spacing.md,
    letterSpacing: -0.1,
  },
});
