import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.screenshot({ path: "scratch-screenshot.png", fullPage: true });
await browser.close();
console.log("Saved scratch-screenshot.png");
