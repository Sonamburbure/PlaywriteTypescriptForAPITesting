import dotenv from 'dotenv';


const envFile = process.env.ENV_FILE || '.env';

console.log('Loading ENV file:', envFile);

dotenv.config({ path: envFile });

console.log('BASE_UI_URL:', process.env.BASE_UI_URL);
console.log('EMAIL:', process.env.EMAIL);


console.log('BASE_API_URL:', process.env.BASE_API_URL);
console.log('EMAIL:', process.env.EMAIL);

import { AuthApi } from '../src/api/AuthApi.js';
import { setAuthToken, setTenantPath, setLogonAs } from '../src/utils/tokenStore.js';
import { EMAIL, PASSWORD, BASE_UI_URL } from '../src/utils/constants.js';
import { request, chromium } from '@playwright/test';

export default async () => {

  // 🚨 Stop immediately if env not loaded
  if (!process.env.BASE_UI_URL) {
    throw new Error('BASE_UI_URL is undefined. Check .env file.');
  }

  // ===== API LOGIN =====
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

      console.log('✅ API login successful in global setup');

    } finally {
      await apiContext.dispose();
    }
  }

  // ===== UI LOGIN =====
  if (process.env.TEST_TYPE === 'ui') {

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    console.log('Navigating to:', BASE_UI_URL);

   await page.goto(BASE_UI_URL, { waitUntil: 'networkidle' });

await page.getByPlaceholder('Email').fill(EMAIL!);
await page.locator('input[name="password"]').fill(PASSWORD!);

const loginBtn = page.locator("//button[normalize-space()='Login']");
await loginBtn.waitFor({ state: 'visible', timeout: 60000 });
await loginBtn.click();

// wait for something after login
await page.locator("i[role='button']").waitFor({ timeout: 60000 });

await page.context().storageState({ path: 'storageState.json' });
    await browser.close();

    console.log('✅ UI login successful in global setup');
  }
};