import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { colors, radius, spacing, typography } from "@/theme";

interface Props {
  originalDuration: number;
  modifiedDuration: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function ComparisonBar({ originalDuration, modifiedDuration }: Props) {
  const diff = modifiedDuration - originalDuration;
  const diffMins = Math.round(diff / 60);
  const isFaster = diff < 0;
  const isSame = diff === 0;
  const diffText = isSame ? "same" : isFaster ? `${diffMins} min` : `+${diffMins} min`;

  const accentColor = isFaster
    ? colors.success
    : isSame
    ? colors.textTertiary
    : colors.danger;

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.setValue(0);
    Animated.spring(pulse, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [modifiedDuration]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { borderColor: accentColor + "40", transform: [{ scale }] },
      ]}
    >
      <View style={styles.timeBlock}>
        <Text style={styles.label}>Original</Text>
        <Text style={styles.original}>{formatDuration(originalDuration)}</Text>
      </View>

      <View style={styles.arrowBlock}>
        <View style={[styles.arrow, { backgroundColor: accentColor }]} />
      </View>

      <View style={styles.timeBlock}>
        <Text style={styles.label}>Modified</Text>
        <Text style={[styles.modified, { color: accentColor }]}>
          {formatDuration(modifiedDuration)}
        </Text>
      </View>

      <View style={[styles.diffBadge, { backgroundColor: accentColor + "1F" }]}>
        <Text style={[styles.diffText, { color: accentColor }]}>
          {diffText}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  timeBlock: { flex: 1 },
  label: {
    fontFamily: typography.bodyMed,
    fontSize: 10,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  original: {
    fontFamily: typography.displayMed,
    fontSize: 16,
    color: colors.textSecondary,
    letterSpacing: -0.4,
  },
  modified: {
    fontFamily: typography.display,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  arrowBlock: { paddingHorizontal: spacing.md },
  arrow: {
    width: 20,
    height: 1.5,
    borderRadius: 1,
  },
  diffBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginLeft: spacing.md,
  },
  diffText: {
    fontFamily: typography.bodyBold,
    fontSize: 12,
    letterSpacing: -0.2,
  },
});
