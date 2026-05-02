import MapboxGL from "@rnmapbox/maps";
import { coordinatesToGeoJSON } from "@/utils/polyline";
import type { Coordinate } from "@/services/routing/types";
import { colors } from "@/theme";

interface Props {
  activeRoute: Coordinate[];
  modifiedRoute?: Coordinate[] | null;
}

export function RouteOverlay({ activeRoute, modifiedRoute }: Props) {
  const activeGeoJSON = coordinatesToGeoJSON(activeRoute);

  return (
    <>
      {/* Glow layer for active route */}
      <MapboxGL.ShapeSource
        id="active-route-glow"
        shape={{ type: "Feature", geometry: activeGeoJSON, properties: {} }}
      >
        <MapboxGL.LineLayer
          id="active-route-glow-line"
          style={{
            lineColor: colors.accent,
            lineWidth: 14,
            lineCap: "round",
            lineJoin: "round",
            lineOpacity: 0.25,
            lineBlur: 6,
          }}
        />
      </MapboxGL.ShapeSource>

      {/* Active route */}
      <MapboxGL.ShapeSource
        id="active-route"
        shape={{ type: "Feature", geometry: activeGeoJSON, properties: {} }}
      >
        <MapboxGL.LineLayer
          id="active-route-line"
          style={{
            lineColor: colors.accentBright,
            lineWidth: 6,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      </MapboxGL.ShapeSource>

      {/* Modified route (what-if) */}
      {modifiedRoute && modifiedRoute.length > 0 && (
        <MapboxGL.ShapeSource
          id="modified-route"
          shape={{
            type: "Feature",
            geometry: coordinatesToGeoJSON(modifiedRoute),
            properties: {},
          }}
        >
          <MapboxGL.LineLayer
            id="modified-route-line"
            style={{
              lineColor: "#94A3B8",
              lineWidth: 5,
              lineCap: "round",
              lineJoin: "round",
              lineDasharray: [2, 2.5],
              lineOpacity: 0.85,
            }}
          />
        </MapboxGL.ShapeSource>
      )}
    </>
  );
}
