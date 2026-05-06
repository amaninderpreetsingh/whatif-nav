/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Generates the WhatIf Nav app icon set from SVG.
 *
 * Concept: A map showing a route from an origin pin, branching into one main
 * path (bright, solid) and one alternative path (dim, dashed) — the literal
 * "what-if" of navigation.
 *
 * Outputs (all PNG, 1024x1024):
 *   assets/icon.png            -- Full icon: gradient bg + map illustration
 *   assets/adaptive-icon.png   -- Android foreground: illustration on transparent bg, padded
 *   assets/splash-icon.png     -- Splash: illustration on the brand bg color
 *
 * Re-run with: node scripts/generate-icons.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const SIZE = 1024;

const COLORS = {
  bgDeep: "#070A14",
  bgPrimary: "#0A0E1A",
  bgHighlight: "#1E2538",
  gridLine: "rgba(148, 163, 184, 0.06)",
  accent: "#3B82F6",
  accentBright: "#60A5FA",
  accentDim: "#94A3B8",
  white: "#FFFFFF",
};

/**
 * Builds the route illustration in 1024-unit coordinate space, centered.
 * scale=1 fills the canvas; smaller scales pad inward (for adaptive/splash).
 */
function mapIllustration({ scale = 1 } = {}) {
  // All coords are designed for a 1024 canvas, then scaled around the center
  const cx = 512;
  const cy = 512;
  const s = (n) => cx + (n - cx) * scale;
  const ys = (n) => cy + (n - cy) * scale;
  const w = (n) => n * scale; // stroke widths

  // Origin pin (bottom)
  const origin = { x: s(330), y: ys(820) };
  // Fork node (the decision point)
  const fork = { x: s(512), y: ys(540) };
  // Main destination (upper right)
  const mainDest = { x: s(780), y: ys(240) };
  // Alternative destination (upper left)
  const altDest = { x: s(244), y: ys(240) };

  // Curve control points for that gentle road bend
  const c1 = { x: s(330), y: ys(680) };
  const c2 = { x: s(420), y: ys(580) };
  const cMain1 = { x: s(620), y: ys(440) };
  const cMain2 = { x: s(720), y: ys(340) };
  const cAlt1 = { x: s(420), y: ys(440) };
  const cAlt2 = { x: s(310), y: ys(340) };

  const stroke = w(40);
  const altStroke = w(28);
  const dashGap = w(36);
  const dashLen = w(46);

  return `
  <!-- Faint road outline halo for the main route -->
  <path
    d="M ${origin.x} ${origin.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${fork.x} ${fork.y}
       C ${cMain1.x} ${cMain1.y}, ${cMain2.x} ${cMain2.y}, ${mainDest.x} ${mainDest.y}"
    stroke="${COLORS.accent}" stroke-opacity="0.2"
    stroke-width="${stroke + w(28)}"
    stroke-linecap="round" stroke-linejoin="round" fill="none"
  />

  <!-- Alternative path (what-if) — dashed, dimmer -->
  <path
    d="M ${fork.x} ${fork.y} C ${cAlt1.x} ${cAlt1.y}, ${cAlt2.x} ${cAlt2.y}, ${altDest.x} ${altDest.y}"
    stroke="${COLORS.accentDim}" stroke-opacity="0.85"
    stroke-width="${altStroke}"
    stroke-linecap="round" stroke-linejoin="round" fill="none"
    stroke-dasharray="${dashLen} ${dashGap}"
  />

  <!-- Main route: origin → fork → main destination, solid bright blue -->
  <path
    d="M ${origin.x} ${origin.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${fork.x} ${fork.y}
       C ${cMain1.x} ${cMain1.y}, ${cMain2.x} ${cMain2.y}, ${mainDest.x} ${mainDest.y}"
    stroke="url(#routeGradient)"
    stroke-width="${stroke}"
    stroke-linecap="round" stroke-linejoin="round" fill="none"
  />

  <!-- Origin pin (filled circle with white core) -->
  <circle cx="${origin.x}" cy="${origin.y}" r="${w(56)}"
    fill="${COLORS.accent}" opacity="0.25" />
  <circle cx="${origin.x}" cy="${origin.y}" r="${w(36)}"
    fill="${COLORS.accent}" stroke="${COLORS.white}" stroke-width="${w(8)}" />

  <!-- Alternative destination pin (smaller, dimmer) -->
  <circle cx="${altDest.x}" cy="${altDest.y}" r="${w(28)}"
    fill="${COLORS.accentDim}" stroke="${COLORS.white}" stroke-width="${w(6)}" opacity="0.85" />

  <!-- Main destination pin (the prominent one) -->
  <circle cx="${mainDest.x}" cy="${mainDest.y}" r="${w(60)}"
    fill="${COLORS.accentBright}" opacity="0.3" />
  <circle cx="${mainDest.x}" cy="${mainDest.y}" r="${w(40)}"
    fill="${COLORS.accentBright}" stroke="${COLORS.white}" stroke-width="${w(10)}" />

  <!-- Fork glow (decision point) -->
  <circle cx="${fork.x}" cy="${fork.y}" r="${w(60)}" fill="url(#forkGlow)" />`;
}

const SHARED_DEFS = `
  <radialGradient id="brandBg" cx="35%" cy="30%" r="100%">
    <stop offset="0%" stop-color="${COLORS.bgHighlight}" />
    <stop offset="60%" stop-color="${COLORS.bgPrimary}" />
    <stop offset="100%" stop-color="${COLORS.bgDeep}" />
  </radialGradient>

  <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="${COLORS.accent}" />
    <stop offset="100%" stop-color="${COLORS.accentBright}" />
  </linearGradient>

  <radialGradient id="forkGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${COLORS.accentBright}" stop-opacity="0.85" />
    <stop offset="100%" stop-color="${COLORS.accentBright}" stop-opacity="0" />
  </radialGradient>

  <pattern id="mapGrid" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
    <path d="M 120 0 L 0 0 0 120" fill="none" stroke="${COLORS.gridLine}" stroke-width="1.5" />
  </pattern>`;

function buildSVG({ background, content }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>${SHARED_DEFS}</defs>
  ${background}
  ${content}
</svg>`;
}

const iconSVG = buildSVG({
  background: `
    <rect width="${SIZE}" height="${SIZE}" fill="url(#brandBg)" />
    <rect width="${SIZE}" height="${SIZE}" fill="url(#mapGrid)" />`,
  content: mapIllustration({ scale: 1 }),
});

const adaptiveIconSVG = buildSVG({
  background: `<rect width="${SIZE}" height="${SIZE}" fill="transparent" />`,
  content: mapIllustration({ scale: 0.66 }),
});

const splashIconSVG = buildSVG({
  background: `<rect width="${SIZE}" height="${SIZE}" fill="${COLORS.bgPrimary}" />`,
  content: mapIllustration({ scale: 0.55 }),
});

async function render(svg, filename) {
  const filepath = path.join(ASSETS_DIR, filename);
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(filepath);
  const { size } = fs.statSync(filepath);
  console.log(`  wrote ${filename} (${(size / 1024).toFixed(1)} KB)`);
}

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
  console.log("Generating WhatIf Nav icons...");
  await render(iconSVG, "icon.png");
  await render(adaptiveIconSVG, "adaptive-icon.png");
  await render(splashIconSVG, "splash-icon.png");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
