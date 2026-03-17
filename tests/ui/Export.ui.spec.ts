import { test, expect, Response } from '@playwright/test';
import { ExportPage } from '../../src/pages/ExportPage.js';

test('Export Account UI Test', async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_UI_URL!);

  const exportPage = new ExportPage(page);

  // 👉 Start waiting for API before action
  const responsePromise = page.waitForResponse(
    (resp: Response) =>
      resp.url().toLowerCase().includes('export') &&
      resp.request().method() === 'POST',
    { timeout: 60000 }
  );

  // 👉 Perform export (this also handles download + screenshot)
  await exportPage.exportAccount(testInfo);

  // 👉 Get API response
  const response = await responsePromise;

  const body = await response.json();
  console.log('Full response body:', body);

  // ✅ API validation
  expect(response.ok()).toBeTruthy();
});