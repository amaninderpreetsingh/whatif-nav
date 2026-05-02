import MapboxGL from "@rnmapbox/maps";

/**
 * Mapbox style configuration for the WhatIf Nav app.
 *
 * We default to Mapbox's `Dark` style which complements the app's
 * near-black, blue-accented aesthetic. A `nightCustom` slot is reserved
 * for a future custom-published Studio style; until then it falls back
 * to the stock dark style so callers can swap with no code changes.
 */
export const MAPBOX_STYLES = {
  dark: MapboxGL.StyleURL.Dark,
  nightCustom:
    process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL || MapboxGL.StyleURL.Dark,
  light: MapboxGL.StyleURL.Light,
  trafficDay: MapboxGL.StyleURL.TrafficDay,
  trafficNight: MapboxGL.StyleURL.TrafficNight,
} as const;

export type MapboxStyleKey = keyof typeof MAPBOX_STYLES;

/** Default style used by the home and navigation screens. */
export const DEFAULT_MAP_STYLE = MAPBOX_STYLES.dark;

/**
 * Default camera framing centered on Manhattan. Used as a fallback
 * before the user's location is available.
 */
export const DEFAULT_CAMERA = {
  centerCoordinate: [-74.006, 40.7128] as [number, number],
  zoomLevel: 12,
  animationDuration: 500,
};
