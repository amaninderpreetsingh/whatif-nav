import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { signOut, getCurrentUser } from "@/services/firebase/auth";
import {
  getUserProfile,
  updateRoutingProvider,
} from "@/services/firebase/firestore";
import type { RoutingProvider } from "@/services/routing/types";
import Toast from "react-native-toast-message";
import { colors, radius, spacing, typography, shadows } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = getCurrentUser();
  const [provider, setProvider] = useState<RoutingProvider>("google");
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile) {
        setProvider(profile.routingProvider);
        setUsageCount(profile.apiUsage.routeRequests);
      }
    });
  }, [user]);

  const handleProviderToggle = async (useMapbox: boolean) => {
    if (!user) return;
    Haptics.selectionAsync();
    const newProvider: RoutingProvider = useMapbox ? "mapbox" : "google";
    setProvider(newProvider);
    try {
      await updateRoutingProvider(user.uid, newProvider);
      Toast.show({
        type: "success",
        text1: `Switched to ${newProvider === "google" ? "Google Routes" : "Mapbox"}`,
      });
    } catch {
      Toast.show({ type: "error", text1: "Failed to update setting" });
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const usagePercent = Math.min(100, (usageCount / 5000) * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxxl },
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

      <Text style={styles.title}>Settings</Text>

      {/* Account card */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Account</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Routing provider card */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Routing Engine</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Use Mapbox</Text>
            <Text style={styles.rowSubtitle}>
              Default: Google Routes (best traffic accuracy)
            </Text>
          </View>
          <Switch
            value={provider === "mapbox"}
            onValueChange={handleProviderToggle}
            trackColor={{ false: colors.bgSecondary, true: colors.accent }}
            thumbColor={colors.textPrimary}
            ios_backgroundColor={colors.bgSecondary}
          />
        </View>
      </View>

      {/* Usage card */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>API Usage This Month</Text>
        <View style={styles.usageRow}>
          <Text style={styles.usageValue}>{usageCount.toLocaleString()}</Text>
          <Text style={styles.usageMax}> / 5,000 free</Text>
        </View>
        <View style={styles.usageBar}>
          <View
            style={[
              styles.usageFill,
              { width: `${usagePercent}%` },
            ]}
          />
        </View>
        <Text style={styles.usageHint}>
          Switch to Mapbox if you exceed the free tier
        </Text>
      </View>

      {/* Sign out button */}
      <Pressable
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.signOutPressed,
        ]}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scrollContent: { paddingHorizontal: spacing.xl },
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
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  email: {
    fontFamily: typography.bodyMed,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  rowText: { flex: 1, marginRight: spacing.lg },
  rowTitle: {
    fontFamily: typography.bodyMed,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  usageValue: {
    fontFamily: typography.display,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  usageMax: {
    fontFamily: typography.bodyMed,
    fontSize: 14,
    color: colors.textTertiary,
  },
  usageBar: {
    height: 6,
    backgroundColor: colors.bgSecondary,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  usageFill: {
    height: 6,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  usageHint: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: -0.1,
  },
  signOutButton: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  signOutPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  signOutText: {
    fontFamily: typography.bodyBold,
    fontSize: 14,
    color: colors.danger,
    letterSpacing: -0.1,
  },
});
