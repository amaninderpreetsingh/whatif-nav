import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useConnectionStore } from "@/stores/connection-store";
import { colors, radius, spacing, typography, shadows } from "@/theme";

export function ConnectionBanner() {
  const insets = useSafeAreaInsets();
  const status = useConnectionStore((s) => s.status);
  const slideY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (status === "online") {
      Animated.timing(slideY, {
        toValue: -100,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }).start();
    }
  }, [status]);

  if (status === "online") return null;

  const config = {
    degraded: {
      text: "Limited connectivity",
      accent: colors.warning,
    },
    offline: {
      text: "Offline — route may not reflect current traffic",
      accent: colors.danger,
    },
  };

  const { text, accent } = config[status];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top + spacing.sm,
          transform: [{ translateY: slideY }],
        },
      ]}
    >
      <BlurView intensity={60} tint="dark" style={styles.blur}>
        <View style={[styles.banner, { borderColor: accent + "60" }]}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={styles.text}>{text}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.pill,
    overflow: "hidden",
    zIndex: 100,
    ...shadows.md,
  },
  blur: { overflow: "hidden" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: "rgba(20, 25, 40, 0.65)",
    borderWidth: 1,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    marginRight: spacing.sm,
  },
  text: {
    fontFamily: typography.bodyMed,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
});
