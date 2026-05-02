const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const VIEWPORT = { width: 390, height: 844 };

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log("=== Test 1: Toggle to Sign Up mode ===");
  await page.locator("text=Create one").click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "10-signup-mode.png"),
  });

  // Visible text after toggle
  const signUpText = await page.evaluate(() => document.body.innerText);
  console.log("Sign-up screen text:", signUpText.slice(0, 300));

  console.log("\n=== Test 2: Sign up with test account ===");
  // Use a unique email each run to avoid "already exists" errors
  const testEmail = `playwright-test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  await page.locator("input").first().fill(testEmail);
  await page.locator("input").nth(1).fill(testPassword);
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "11-signup-filled.png"),
  });

  // Click "Create account" — pick the button (last occurrence)
  console.log("Clicking Create account button...");
  await page.locator("text=Create account").last().click();

  // Wait up to 15s for redirect to home or any change
  console.log("Waiting for navigation/auth...");
  try {
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes("Where to?") ||
          text.includes("Map screen") ||
          text.includes("error") ||
          text.includes("Sign up failed")
        );
      },
      { timeout: 15000 }
    );
  } catch (e) {
    console.log("Timeout waiting for state change, continuing anyway");
  }
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "12-after-signup.png"),
    fullPage: false,
  });
  const afterSignupText = await page.evaluate(() => document.body.innerText);
  console.log("After signup text:", afterSignupText.slice(0, 500));

  // Check current URL
  console.log("Current URL:", page.url());

  console.log("\n=== Test 3: Navigate to Settings via chip ===");
  if (afterSignupText.includes("Settings")) {
    await page.locator("text=Settings").first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "13-settings.png"),
    });
    const settingsText = await page.evaluate(() => document.body.innerText);
    console.log("Settings screen text:", settingsText.slice(0, 500));
  }

  console.log("\n=== Test 4: Navigate to Saved routes ===");
  // Go back to home
  await page.goto("http://localhost:3001/(main)", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  if ((await page.evaluate(() => document.body.innerText)).includes("Saved")) {
    await page.locator("text=Saved").first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "14-saved-routes.png"),
    });
    const savedText = await page.evaluate(() => document.body.innerText);
    console.log("Saved routes screen text:", savedText.slice(0, 300));
  }

  console.log("\n=== Errors encountered ===");
  errors.forEach((e) => console.log("  -", e));

  await browser.close();
  console.log("\nDone.");
}

inspect().catch((err) => {
  console.error(err);
  process.exit(1);
});
