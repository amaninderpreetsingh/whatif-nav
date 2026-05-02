import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { onAuthChanged } from "@/services/firebase/auth";
import type { User } from "firebase/auth";
import Toast from "react-native-toast-message";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded && !authLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  useEffect(() => {
    if (authLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(main)");
    }
  }, [user, authLoading, fontsLoaded, segments]);

  if (!fontsLoaded || authLoading) return null;

  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutReady}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
            animation: "fade",
          }}
        />
      </View>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
});
