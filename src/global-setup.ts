import dotenv from 'dotenv';
import { request, chromium } from '@playwright/test';
import { AuthApi } from '../src/api/AuthApi.js';
import { setAuthToken, setTenantPath, setLogonAs } from '../src/utils/tokenStore.js';
import { EMAIL, PASSWORD, BASE_UI_URL } from '../src/utils/constants.js';

dotenv.config({ path: process.env.ENV_FILE || '.env.prod' });

export default async () => {

  console.log('🚀 Starting global setup...');

  if (!process.env.BASE_UI_URL) {
    throw new Error('BASE_UI_URL is undefined. Check .env file.');
  }

  /* ================= API LOGIN ================= */

  if (process.env.TEST_TYPE === 'api') {

    const apiContext = await request.newContext();

    try {
      const authApi = new AuthApi(apiContext);

      const loginResponse = await authApi.login(EMAIL, PASSWORD);

      if (!loginResponse.ok()) {
        throw new Error(
          `Login failed: ${loginResponse.status()} ${loginResponse.statusText()}`
        );
      }

      const loginBody = await loginResponse.json();

      setAuthToken(loginBody.token || loginBody.access_token);
      setTenantPath(loginBody.tenant_cname || '');
      setLogonAs(loginBody.logon_as || process.env.LOGON_AS!);

      console.log('✅ API login successful');

    } finally {
      await apiContext.dispose();
    }
  }

  /* ================= UI LOGIN ================= */

  if (process.env.TEST_TYPE === 'ui') {

    const browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: null
    });

    const page = await context.newPage();

    console.log('🌐 Navigating to:', BASE_UI_URL);

    await page.goto(BASE_UI_URL!, { waitUntil: 'networkidle' });

    // Fill login form
    await page.getByPlaceholder('Email').fill(EMAIL!);
    await page.locator('input[name="password"]').fill(PASSWORD!);

    const loginBtn = page.locator("//button[normalize-space()='Login']");
    await loginBtn.waitFor({ state: 'visible', timeout: 60000 });
    await loginBtn.click();

    // Wait for homepage/menu icon
    await page.locator("i[role='button']").waitFor({ timeout: 60000 });

    console.log('✅ UI login successful');

    // Save login session for tests
    await context.storageState({ path: 'storageState.json' });

    console.log('💾 storageState.json saved');

    await browser.close();
  }

};