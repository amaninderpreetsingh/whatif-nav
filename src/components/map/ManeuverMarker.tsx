import { View, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Haptics from "expo-haptics";
import type { Step } from "@/services/routing/types";
import { colors } from "@/theme";

interface Props {
  step: Step;
  onPress: (step: Step) => void;
  highlighted?: boolean;
}

export function ManeuverMarker({ step, onPress, highlighted }: Props) {
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
      />
    </MapboxGL.PointAnnotation>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 3,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  markerHighlighted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentBright,
    borderColor: "#FFFFFF",
  },
});
