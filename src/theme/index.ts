export const colors = {
  // Backgrounds
  bgPrimary: "#0A0E1A",        // Near-black with blue undertone
  bgSecondary: "#111524",      // Slightly elevated surface
  bgElevated: "#1A1F2E",       // Cards, sheets
  bgGlass: "rgba(20, 25, 40, 0.72)", // Glassmorphism backdrop

  // Accents
  accent: "#3B82F6",           // Electric blue (primary)
  accentBright: "#60A5FA",     // Brighter blue (hover/highlights)
  accentDim: "#1E40AF",        // Deeper blue (pressed states)
  accentGlow: "rgba(59, 130, 246, 0.25)", // Soft glow

  // Status
  success: "#10B981",          // Emerald (faster route)
  warning: "#F59E0B",          // Amber (degraded connection)
  danger: "#EF4444",           // Red (slower route, errors)

  // Text
  textPrimary: "#F8FAFC",      // Near-white
  textSecondary: "#94A3B8",    // Muted gray
  textTertiary: "#64748B",     // Disabled/labels

  // Borders
  borderSubtle: "rgba(148, 163, 184, 0.08)",
  borderMedium: "rgba(148, 163, 184, 0.16)",
  borderStrong: "rgba(148, 163, 184, 0.32)",
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  display: "SpaceGrotesk_700Bold",
  displayMed: "SpaceGrotesk_500Medium",
  bodyBold: "Inter_700Bold",
  bodyMed: "Inter_500Medium",
  body: "Inter_400Regular",
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};
