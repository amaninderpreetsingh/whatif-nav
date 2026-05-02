import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "@/theme";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map screen — coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
  },
  text: {
    fontFamily: typography.bodyMed,
    color: colors.textPrimary,
    fontSize: 18,
  },
});
