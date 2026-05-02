import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { getCurrentUser } from "@/services/firebase/auth";
import { saveRoute } from "@/services/firebase/firestore";
import { useNavigationStore } from "@/stores/navigation-store";
import Toast from "react-native-toast-message";
import { colors, radius, spacing, typography, shadows } from "@/theme";

export default function RouteSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const activeRoute = useNavigationStore((s) => s.activeRoute);
  const origin = useNavigationStore((s) => s.origin);
  const destination = useNavigationStore((s) => s.destination);
  const stopNavigation = useNavigationStore((s) => s.stopNavigation);
  const [routeName, setRouteName] = useState("");
  const [saving, setSaving] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
      }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleSave = async () => {
    if (!user || !activeRoute || !origin || !destination) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await saveRoute({
        userId: user.uid,
        name: routeName.trim() || `Route ${new Date().toLocaleDateString()}`,
        origin: {
          lat: origin.lat, lng: origin.lng,
          address: `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
        },
        destination: {
          lat: destination.lat, lng: destination.lng,
          address: `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`,
        },
        waypoints: [],
        estimatedTime: Math.round(activeRoute.duration / 60),
        distance: activeRoute.distance,
      });
      Toast.show({ type: "success", text1: "Route saved" });
      stopNavigation();
      router.replace("/(main)");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: "error", text1: "Failed to save route" });
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    Haptics.selectionAsync();
    stopNavigation();
    router.replace("/(main)");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <LinearGradient
        colors={["rgba(16, 185, 129, 0.15)", "transparent"]}
        style={styles.gradientBg}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
      >
        <View style={styles.successBadge}>
          <View style={styles.successDot} />
        </View>

        <Text style={styles.title}>You've arrived</Text>
        <Text style={styles.subtitle}>Hope it was a good trip</Text>

        {activeRoute && (
          <View style={styles.statsCard}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>
                {formatTime(activeRoute.duration)}
              </Text>
              <Text style={styles.statLabel}>min total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>
                {(activeRoute.distance / 1000).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
          </View>
        )}

        <Text style={styles.formLabel}>Save this route?</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Name this route (optional)"
            placeholderTextColor={colors.textTertiary}
            value={routeName}
            onChangeText={setRouteName}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          <LinearGradient
            colors={[colors.accentBright, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveText}>
              {saving ? "Saving..." : "Save route"}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={handleDone} style={styles.doneButton}>
          <Text style={styles.doneText}>Done without saving</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  gradientBg: {
    position: "absolute", top: 0, left: 0, right: 0, height: "60%",
  },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  successBadge: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.xl,
  },
  successDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.success,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 40,
    color: colors.textPrimary,
    letterSpacing: -1.4,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
    letterSpacing: -0.2,
  },
  statsCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xxxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statValue: {
    fontFamily: typography.display,
    fontSize: 38,
    color: colors.accentBright,
    letterSpacing: -1.4,
  },
  statLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statDivider: { width: 1, height: 48, backgroundColor: colors.borderSubtle },
  formLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  input: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.lg,
  },
  saveButton: {
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadows.glow,
    marginBottom: spacing.md,
  },
  saveGradient: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  saveText: {
    fontFamily: typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  doneButton: { alignItems: "center", paddingVertical: spacing.md },
  doneText: {
    fontFamily: typography.bodyMed,
    fontSize: 14,
    color: colors.textTertiary,
    letterSpacing: -0.1,
  },
});
