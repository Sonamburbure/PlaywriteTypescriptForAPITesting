import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('Login fails with misleading "Wrong Email or Password" when api.ipify.org is unreachable', async ({ page }) => {
  let dialogMessage = '';
  page.on('dialog', async dialog => {
    dialogMessage = dialog.message();
    console.log('🔔 Dialog shown during login:', dialogMessage);
    await dialog.accept();
  });

  // Simulate the third-party IP-lookup service being unreachable,
  // the same way it currently is on a network that blocks api.ipify.org.
  await page.route('**://api.ipify.org/**', route => route.abort('timedout'));

  await page.goto(process.env.BASE_UI_URL!, { waitUntil: 'load' });

  await page.getByPlaceholder('Email').fill(process.env.EMAIL!);
  await page.locator('input[name="password"]').fill(process.env.PASSWORD!);
  await page.locator("//button[normalize-space()='Login']").click();

  await page.waitForTimeout(5000);

  console.log('📍 Current URL after login attempt:', page.url());
  console.log('🔔 Dialog message captured:', dialogMessage || '(none)');

  try {
    // Expected: login should succeed even if the IP-lookup call fails.
    // Actual (the bug): login fails and shows a misleading credentials error.
    expect(page.url(), 'Login should reach #/home even if api.ipify.org is unreachable').toContain('#/home');
  } finally {
    await page.close();
  }
});
