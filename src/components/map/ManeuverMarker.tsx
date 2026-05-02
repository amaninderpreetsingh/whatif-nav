import { View, Text, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Haptics from "expo-haptics";
import type { Step } from "@/services/routing/types";
import { colors, typography } from "@/theme";

interface Props {
  step: Step;
  onPress: (step: Step) => void;
  highlighted?: boolean;
  order?: number;
}

export function ManeuverMarker({ step, onPress, highlighted, order }: Props) {
  return (
    <MapboxGL.PointAnnotation
      id={step.id}
      coordinate={[step.coordinate.lng, step.coordinate.lat]}
      onSelected={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(step);
      }}
    >
      <View
        style={[
          styles.marker,
          highlighted && styles.markerHighlighted,
        ]}
      >
        {highlighted && order !== undefined ? (
          <Text style={styles.orderText}>{order}</Text>
        ) : null}
      </View>
    </MapboxGL.PointAnnotation>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 3,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  markerHighlighted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentBright,
    borderColor: "#FFFFFF",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  orderText: {
    fontFamily: typography.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 14,
    textAlign: "center",
  },
});
