const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
const VIEWPORT = { width: 390, height: 844 };

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const networkLogs = [];
  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("firebase") ||
      url.includes("cloudfunctions") ||
      url.includes("googleapis")
    ) {
      networkLogs.push(`→ ${req.method()} ${url}`);
    }
  });
  page.on("response", (res) => {
    const url = res.url();
    if (
      url.includes("firebase") ||
      url.includes("cloudfunctions") ||
      url.includes("googleapis")
    ) {
      networkLogs.push(`← ${res.status()} ${url}`);
    }
  });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Sign up
  console.log("=== Signing up new test account ===");
  await page.locator("text=Create one").click();
  await page.waitForTimeout(800);
  const testEmail = `route-test-${Date.now()}@example.com`;
  await page.locator("input").first().fill(testEmail);
  await page.locator("input").nth(1).fill("TestPassword123!");
  await page.locator("text=Create account").last().click();

  console.log("Waiting for home...");
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes("Saved") && text.includes("Settings");
    },
    { timeout: 20000 }
  );
  await page.waitForTimeout(5000); // wait for map tiles

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "20-home-loaded.png"),
  });

  console.log("=== Tapping map to set destination ===");
  // Tap in middle of map area (avoiding chips/search)
  await page.mouse.click(195, 500);
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "21-destination-set.png"),
  });

  const homeText = await page.evaluate(() => document.body.innerText);
  console.log("Visible text after tap:", homeText.slice(0, 500));

  if (homeText.includes("Start")) {
    console.log("=== Tapping Start to trigger route calculation ===");
    await page.locator("text=Start").click();
    console.log("Waiting for route calculation (Cloud Function call)...");
    await page.waitForTimeout(8000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "22-after-start.png"),
    });
    const navText = await page.evaluate(() => document.body.innerText);
    console.log("After Start text:", navText.slice(0, 500));
    console.log("Current URL:", page.url());
  }

  console.log("\n=== Network logs (Firebase / Cloud Functions / Google APIs) ===");
  networkLogs.forEach((l) => console.log("  ", l));

  console.log("\n=== Console errors ===");
  errors.forEach((e) => console.log("  -", e));

  await browser.close();
  console.log("\nDone.");
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
