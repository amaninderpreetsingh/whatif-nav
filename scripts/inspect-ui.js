const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORT_IPHONE = { width: 390, height: 844 };

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT_IPHONE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleLogs = [];
  page.on("console", (msg) => {
    const entry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(entry);
    if (msg.type() === "error") consoleErrors.push(entry);
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  console.log("=== Loading app at http://localhost:3001 ===");
  await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000); // wait for fonts + auth check

  console.log("=== Initial render ===");
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "01-initial.png"),
    fullPage: false,
  });

  const title = await page.title();
  const bodyHTML = await page.content();
  const visibleText = await page.evaluate(() => document.body.innerText);
  const computedStyles = await page.evaluate(() => {
    const body = document.body;
    const cs = window.getComputedStyle(body);
    return {
      backgroundColor: cs.backgroundColor,
      fontFamily: cs.fontFamily,
      color: cs.color,
    };
  });

  console.log("Page title:", title);
  console.log("Visible text:", visibleText.slice(0, 500));
  console.log("Computed body styles:", computedStyles);
  console.log("Console errors:", consoleErrors.length);
  consoleErrors.forEach((e) => console.log("  -", e));

  // Try interactions
  console.log("\n=== Looking for sign-in inputs ===");
  const inputs = await page.locator("input").count();
  console.log("Input count:", inputs);

  if (inputs >= 2) {
    const emailInput = page.locator("input").first();
    const passwordInput = page.locator("input").nth(1);
    await emailInput.fill("test@example.com");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02-email-filled.png"),
    });
    await passwordInput.fill("testpassword123");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "03-form-filled.png"),
    });
  }

  // Find buttons
  console.log("\n=== Buttons on page ===");
  const buttonCount = await page.locator('div[role="button"], button, [aria-label]').count();
  console.log("Button-ish elements:", buttonCount);

  // Check if Mapbox loaded
  const mapboxLoaded = await page.evaluate(() => typeof window.mapboxgl !== "undefined");
  console.log("\nMapbox GL loaded:", mapboxLoaded);

  // Check fonts
  const loadedFonts = await page.evaluate(async () => {
    if (!document.fonts) return null;
    await document.fonts.ready;
    const list = [];
    document.fonts.forEach((f) => list.push(`${f.family} ${f.weight}`));
    return list;
  });
  console.log("Loaded fonts:", loadedFonts);

  // Save full page DOM for inspection
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, "page.html"), bodyHTML);
  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, "console.log"),
    consoleLogs.join("\n")
  );

  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "04-final.png"),
    fullPage: true,
  });

  await browser.close();
  console.log("\n=== Done. Screenshots in /screenshots ===");
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
