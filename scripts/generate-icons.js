/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Generates the WhatIf Nav app icon set from SVG.
 *
 * Outputs (all PNG, 1024x1024):
 *   assets/icon.png            -- Full icon: gradient bg + brand mark
 *   assets/adaptive-icon.png   -- Android foreground: brand mark with safe-area padding (transparent bg)
 *   assets/splash-icon.png     -- Splash logo: brand mark on the brand bg color
 *
 * Re-run with: node scripts/generate-icons.js
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const SIZE = 1024;

// Brand palette (must stay in sync with src/theme/index.ts)
const COLORS = {
  bgDeep: "#070A14",
  bgPrimary: "#0A0E1A",
  bgElevated: "#1A1F2E",
  bgHighlight: "#1E2538",
  accent: "#3B82F6",
  accentBright: "#60A5FA",
  white: "#FFFFFF",
};

/**
 * Concentric rings + glowing core.
 * cx/cy/scale describe the layout in 1024-unit space.
 */
function brandMark({ cx = 512, cy = 512, scale = 1 } = {}) {
  const ringFar = 360 * scale;
  const ringMid = 280 * scale;
  const ringNear = 200 * scale;
  const glowR = 180 * scale;
  const dotR = 120 * scale;
  const hlRx = 40 * scale;
  const hlRy = 32 * scale;
  const hlOffset = 37 * scale;

  return `
  <!-- Outermost ring: faint ripple -->
  <circle cx="${cx}" cy="${cy}" r="${ringFar}" fill="none"
    stroke="${COLORS.accent}" stroke-width="${3 * scale}" opacity="0.12" />

  <!-- Mid ring -->
  <circle cx="${cx}" cy="${cy}" r="${ringMid}" fill="none"
    stroke="${COLORS.accent}" stroke-width="${4 * scale}" opacity="0.28" />

  <!-- Near ring: brightest, hints at exploration -->
  <circle cx="${cx}" cy="${cy}" r="${ringNear}" fill="none"
    stroke="${COLORS.accentBright}" stroke-width="${6 * scale}" opacity="0.6" />

  <!-- Soft glow behind the core -->
  <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#brandGlow)" />

  <!-- Solid core dot -->
  <circle cx="${cx}" cy="${cy}" r="${dotR}" fill="url(#brandDot)" />

  <!-- Top-left highlight on the core for that 3D pop -->
  <ellipse cx="${cx - hlOffset}" cy="${cy - hlOffset}"
    rx="${hlRx}" ry="${hlRy}" fill="${COLORS.white}" opacity="0.3" />`;
}

const SHARED_DEFS = `
  <radialGradient id="brandBg" cx="35%" cy="30%" r="100%">
    <stop offset="0%" stop-color="${COLORS.bgHighlight}" />
    <stop offset="60%" stop-color="${COLORS.bgPrimary}" />
    <stop offset="100%" stop-color="${COLORS.bgDeep}" />
  </radialGradient>

  <radialGradient id="brandGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${COLORS.accent}" stop-opacity="0.55" />
    <stop offset="60%" stop-color="${COLORS.accent}" stop-opacity="0.15" />
    <stop offset="100%" stop-color="${COLORS.accent}" stop-opacity="0" />
  </radialGradient>

  <radialGradient id="brandDot" cx="40%" cy="40%" r="60%">
    <stop offset="0%" stop-color="${COLORS.accentBright}" />
    <stop offset="100%" stop-color="${COLORS.accent}" />
  </radialGradient>`;

function buildSVG({ background, content }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>${SHARED_DEFS}</defs>
  ${background}
  ${content}
</svg>`;
}

const iconSVG = buildSVG({
  background: `<rect width="${SIZE}" height="${SIZE}" fill="url(#brandBg)" />`,
  content: brandMark({ scale: 1 }),
});

// Android adaptive icon: foreground-only. The mask crops to a circle/squircle
// at ~66% of the canvas, so we shrink the brand mark to fit safely inside.
const adaptiveIconSVG = buildSVG({
  background: `<rect width="${SIZE}" height="${SIZE}" fill="transparent" />`,
  content: brandMark({ scale: 0.66 }),
});

// Splash icon: brand mark centered on the brand bg color (matches splash bg in app.config.js)
const splashIconSVG = buildSVG({
  background: `<rect width="${SIZE}" height="${SIZE}" fill="${COLORS.bgPrimary}" />`,
  content: brandMark({ scale: 0.55 }),
});

async function render(svg, filename) {
  const filepath = path.join(ASSETS_DIR, filename);
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
