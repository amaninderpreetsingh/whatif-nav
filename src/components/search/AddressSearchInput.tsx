import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  searchAddresses,
  fetchPlaceDetails,
} from "@/services/geocoding/google-places";
import type { GeocodingResult } from "@/services/geocoding/types";
import type { Coordinate } from "@/services/routing/types";
import { colors, radius, spacing, typography, shadows } from "@/theme";

interface Props {
  placeholder?: string;
  proximity?: Coordinate;
  onSelect: (result: GeocodingResult) => void;
  autoFocus?: boolean;
  initialValue?: string;
}

export function AddressSearchInput({
  placeholder = "Where to?",
  proximity,
  onSelect,
  autoFocus = false,
  initialValue = "",
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const showDropdown = focused && (results.length > 0 || loading);
    Animated.timing(dropdownAnim, {
      toValue: showDropdown ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, results.length, loading]);

  const handleChange = (text: string) => {
    setQuery(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myRequestId = ++requestId.current;

    debounceTimer.current = setTimeout(async () => {
      try {
        const found = await searchAddresses(text, { proximity });
        if (myRequestId === requestId.current) {
          setResults(found);
          setLoading(false);
        }
      } catch {
        if (myRequestId === requestId.current) {
          setResults([]);
          setLoading(false);
        }
      }
    }, 300);
  };

  const handleSelect = async (result: GeocodingResult) => {
    Haptics.selectionAsync();
    setQuery(result.placeName);
    setResults([]);
    setFocused(false);
    setLoading(true);
    try {
      // Google Places returns predictions without coordinates — fetch them now
      const detailed = await fetchPlaceDetails(result.id);
      setLoading(false);
      onSelect(detailed);
    } catch {
      setLoading(false);
      // Fall back to the prediction (no coords). Caller should handle gracefully.
      onSelect(result);
    }
  };

  const handleClear = () => {
    Haptics.selectionAsync();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    requestId.current++;
    setQuery("");
    setResults([]);
    setLoading(false);
  };

  const dropdownTranslate = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <View style={styles.wrapper}>
      <BlurView
        intensity={60}
        tint="dark"
        style={[styles.inputBlur, focused && styles.inputBlurFocused]}
      >
        <View style={styles.inputInner}>
          <View style={styles.searchIcon}>
            <View style={styles.searchIconRing} />
            <View style={styles.searchIconHandle} />
          </View>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            autoFocus={autoFocus}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.accent}
              style={styles.loading}
            />
          ) : query.length > 0 ? (
            <Pressable
              onPress={handleClear}
              hitSlop={10}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
            >
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </BlurView>

      {focused && (results.length > 0 || loading) && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              opacity: dropdownAnim,
              transform: [{ translateY: dropdownTranslate }],
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={styles.dropdownBlur}>
            <View style={styles.dropdownInner}>
              {loading && results.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>Searching...</Text>
                </View>
              ) : (
                results.map((result, idx) => (
                  <Pressable
                    key={result.id}
                    onPress={() => handleSelect(result)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      idx > 0 && styles.resultRowDivider,
                      pressed && styles.resultRowPressed,
                    ]}
                  >
                    <View style={styles.pinIcon}>
                      <View style={styles.pinIconInner} />
                    </View>
                    <View style={styles.resultText}>
                      <Text style={styles.resultPrimary} numberOfLines={1}>
                        {result.text}
                      </Text>
                      {result.context.length > 0 && (
                        <Text style={styles.resultSecondary} numberOfLines={1}>
                          {result.context}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  inputBlur: {
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.md,
  },
  inputBlurFocused: { borderColor: colors.accent },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(20, 25, 40, 0.4)",
  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  searchIconRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: colors.textSecondary,
  },
  searchIconHandle: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 6,
    height: 1.8,
    backgroundColor: colors.textSecondary,
    transform: [{ rotate: "45deg" }],
  },
  input: {
    flex: 1,
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  loading: { marginLeft: spacing.sm },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  clearButtonPressed: { backgroundColor: "rgba(148, 163, 184, 0.28)" },
  clearText: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: "center",
  },
  dropdown: {
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.lg,
  },
  dropdownBlur: { overflow: "hidden" },
  dropdownInner: { backgroundColor: "rgba(20, 25, 40, 0.65)" },
  emptyRow: { padding: spacing.lg, alignItems: "center" },
  emptyText: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.textTertiary,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  resultRowPressed: { backgroundColor: "rgba(59, 130, 246, 0.08)" },
  pinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  pinIconInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  resultText: { flex: 1 },
  resultPrimary: {
    fontFamily: typography.bodyMed,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  resultSecondary: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
