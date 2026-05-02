import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { signInWithEmail, signUpWithEmail } from "@/services/firebase/auth";
import { createUserProfile } from "@/services/firebase/firestore";
import Toast from "react-native-toast-message";
import { colors, radius, spacing, typography, shadows } from "@/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const animatePress = (pressed: boolean) => {
    Animated.spring(buttonScale, {
      toValue: pressed ? 0.96 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Toast.show({ type: "error", text1: "Please fill in all fields" });
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        await createUserProfile(
          result.user.uid,
          result.user.email || email,
          result.user.displayName || email.split("@")[0]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await signInWithEmail(email, password);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: "error",
        text1: isSignUp ? "Sign up failed" : "Sign in failed",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setIsSignUp(!isSignUp);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Ambient gradient background */}
      <LinearGradient
        colors={[
          "rgba(59, 130, 246, 0.18)",
          "rgba(59, 130, 246, 0.04)",
          "transparent",
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradientBg}
      />

      {/* Decorative blur orb */}
      <View style={styles.orb} />

      <View style={styles.inner}>
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoMark}>
            <View style={styles.logoCore} />
            <View style={styles.logoRing} />
          </View>
          <Text style={styles.title}>WhatIf</Text>
          <Text style={styles.tagline}>Navigation, reimagined.</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? "Create account" : "Welcome back"}
          </Text>
          <Text style={styles.cardSubtitle}>
            {isSignUp
              ? "Start exploring routes that fit your day"
              : "Pick up where you left off"}
          </Text>

          {/* Email input */}
          <View
            style={[
              styles.inputWrapper,
              emailFocused && styles.inputWrapperFocused,
            ]}
          >
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password input */}
          <View
            style={[
              styles.inputWrapper,
              passwordFocused && styles.inputWrapperFocused,
            ]}
          >
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </View>

          {/* Submit button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPress={handleSubmit}
              onPressIn={() => animatePress(true)}
              onPressOut={() => animatePress(false)}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
              ]}
            >
              <LinearGradient
                colors={[colors.accentBright, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={styles.submitText}>
                    {isSignUp ? "Create account" : "Sign in"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Toggle mode */}
          <Pressable onPress={toggleMode} style={styles.toggleWrapper}>
            <Text style={styles.toggleText}>
              {isSignUp
                ? "Already have an account? "
                : "New here? "}
              <Text style={styles.toggleLink}>
                {isSignUp ? "Sign in" : "Create one"}
              </Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "70%",
  },
  orb: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.accent,
    opacity: 0.08,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xxxl,
    paddingTop: 100,
    justifyContent: "space-between",
    paddingBottom: spacing.xxxl,
  },
  brandSection: {
    alignItems: "flex-start",
  },
  logoMark: {
    width: 56,
    height: 56,
    marginBottom: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    ...shadows.glow,
  },
  logoRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.accent,
    opacity: 0.4,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 56,
    color: colors.textPrimary,
    letterSpacing: -2,
    lineHeight: 60,
  },
  tagline: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.lg,
  },
  cardTitle: {
    fontFamily: typography.display,
    fontSize: 24,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  cardSubtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  inputWrapper: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  inputWrapperFocused: {
    borderColor: colors.accent,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  inputLabel: {
    fontFamily: typography.bodyMed,
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  input: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
    letterSpacing: -0.2,
  },
  submitButton: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.glow,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitGradient: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  toggleWrapper: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  toggleText: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleLink: {
    fontFamily: typography.bodyMed,
    color: colors.accentBright,
  },
});
