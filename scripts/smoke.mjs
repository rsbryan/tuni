// End-to-end smoke: demo import, keyboard ranking, share card render.
// Usage: npm run dev (in another terminal), then `node scripts/smoke.mjs`.
// Screenshots land in scripts/.smoke/.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = new URL("./.smoke", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (
  await browser.newContext({ viewport: { width: 1280, height: 900 } })
).newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const modal = page.locator("div.fixed.z-50");
const doneOrCompare = modal.locator(
  "button:has-text('Done'), h2:has-text('Which one wins?')"
);

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();

// Import the demo library into the queue (via the review step)
await page.click("text=Import");
await page.click("text=Demo library");
await page.click("button:has-text('Add 26 to queue')");
await page.waitForSelector("text=Added 26");
await page.click("text=Rank queue");
await page.screenshot({ path: `${OUT}/home.png` });

// Rank five songs through the tier + matchup flow via keyboard
await page.click("button:has-text('Rank next')");
for (let i = 0; i < 5; i++) {
  await modal.locator("text=First impression?").waitFor();
  await page.keyboard.press("1");
  for (let c = 0; c < 8; c++) {
    await doneOrCompare.first().waitFor();
    if (await modal.locator("button", { hasText: "Done" }).count()) break;
    await page.keyboard.press(c % 2 === 0 ? "ArrowLeft" : "ArrowRight");
    await page.waitForTimeout(350);
  }
  await modal.locator("button", { hasText: "Done" }).waitFor();
  if (i < 4) await modal.locator("button", { hasText: "Rank next (" }).click();
}
await modal.locator("button", { hasText: "Done" }).click();
await page.screenshot({ path: `${OUT}/ranked.png` });

// Stats page
await page.click("text=Stats");
await page.waitForSelector("text=Tier split");
await page.screenshot({ path: `${OUT}/stats.png` });
await page.click("text=Back to rankings");

// Share card
await page.click("button:has-text('Share')");
await modal.locator("text=Share your top 10").waitFor();
await page.waitForSelector(
  "button:has-text('Download image'):not([disabled])",
  { timeout: 15000 }
);
const dataUrl = await page.evaluate(() =>
  document.querySelector("canvas").toDataURL("image/png")
);
writeFileSync(
  `${OUT}/share-card.png`,
  Buffer.from(dataUrl.split(",")[1], "base64")
);

await browser.close();
if (errors.length > 0) {
  console.error("Console errors:", errors);
  process.exit(1);
}
console.log(`Smoke passed. Screenshots in ${OUT}`);
