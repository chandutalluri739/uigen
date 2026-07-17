import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.click("text=1 Issue").catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: "scratch-issue.png", fullPage: true });
const text = await page.evaluate(() => document.body.innerText);
console.log(text.slice(0, 3000));
await browser.close();
