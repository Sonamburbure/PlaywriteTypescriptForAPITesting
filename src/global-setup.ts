import dotenv from 'dotenv';
import { request, chromium } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs
} from '../src/utils/tokenStore.js';

dotenv.config({ path: process.env.ENV_FILE || '.env.dev' });

export default async () => {
  console.log('🚀 Starting global setup...');

  /* ================= API LOGIN ================= */
  if (process.env.TEST_TYPE === 'api') {
    // Create API context with baseURL and ignore HTTPS errors for dev
    const apiContext = await request.newContext({
      baseURL: process.env.BASE_API_URL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'x-automate-secret': process.env.AUTOMATE_SECRET || '',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    console.log('🔑 Using API EMAIL:', process.env.API_EMAIL);

    try {
      const loginRes = await apiContext.post('/api/login', {
        data: {
          email: process.env.API_EMAIL,
          password: process.env.API_PASSWORD,
          tenant_name: process.env.TENANT_NAME
        }
      });

      const text = await loginRes.text();
      console.log('🔍 API Login Response:', text);

      if (!loginRes.ok()) {
        throw new Error(`❌ API Login failed: ${loginRes.status()} \n${text}`);
      }

      const body = JSON.parse(text);

      setAuthToken(body.token);
      setTenantPath(body.tenant_cname);
      setLogonAs(body.logon_as);

      console.log('🎉 API login successful');
    } catch (err: any) {
      console.error('❌ API login failed:', err.message);
      throw err;
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

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    console.log('🌐 Navigating to:', process.env.BASE_UI_URL);

    await page.goto(process.env.BASE_UI_URL!, { waitUntil: 'networkidle' });

    // Fill login form
    await page.getByPlaceholder('Email').fill(process.env.EMAIL!);
    await page.locator('input[name="password"]').fill(process.env.PASSWORD!);

    const loginBtn = page.locator("//button[normalize-space()='Login']");
    await loginBtn.waitFor({ state: 'visible', timeout: 60000 });
    await loginBtn.click();

    // Wait for dashboard/home page to load
    await page.locator("i[role='button']").waitFor({ timeout: 60000 });

    console.log('🎉 UI login successful');

    // Save storageState for future test sessions
    await context.storageState({ path: 'storageState.json' });
    console.log('💾 storageState.json saved');

    await browser.close();
  }
};