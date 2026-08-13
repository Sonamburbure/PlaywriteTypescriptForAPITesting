import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ storageState: 'storageState.json', viewport: { width: 1400, height: 1000 } });
const page = await context.newPage();

await page.goto('https://web.automateevents.com/#/home', { waitUntil: 'load' });
await page.waitForTimeout(1500);

await page.locator("i[role='button'] svg").first().click();
await page.waitForTimeout(1000);

await page.getByText('Third Parties', { exact: true }).click();
await page.waitForTimeout(1000);

await page.screenshot({ path: '_menu_expanded.png', fullPage: true });

const menuText = await page.locator('body').innerText();
console.log('--- PAGE TEXT AFTER CLICKING THIRD PARTIES ---');
console.log(menuText);

await browser.close();
