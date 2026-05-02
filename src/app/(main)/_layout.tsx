import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
      }}
    />
  );
}
