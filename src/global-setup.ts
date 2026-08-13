import dotenv from 'dotenv';
import fs from 'fs';
import { request, chromium } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs
} from '../src/utils/tokenStore.js';

const args = process.argv.join(' ');
const defaultEnv = args.includes('.api.spec') ? '.env.dev' : args.includes('.ui.spec') ? '.env.prod' : '.env.prod';
const envFile = process.env.ENV_FILE || defaultEnv;
process.env.ENV_FILE = envFile;
dotenv.config({ path: envFile, override: true });

export default async () => {
  const detectedType = args.includes('.api.spec') ? 'api' : args.includes('.ui.spec') ? 'ui' : undefined;
  const testType = process.env.TEST_TYPE || detectedType;

  console.log('🚀 Starting global setup...');
  console.log('   ENV FILE  :', envFile);
  console.log('   TEST TYPE :', testType || '(not set — defaulting to ui)');
  console.log('   API URL   :', process.env.BASE_API_URL);
  console.log('   UI URL    :', process.env.BASE_UI_URL);

  /* ================= API LOGIN ================= */
  if (testType === 'api') {
    const apiContext = await request.newContext({
      baseURL: process.env.BASE_API_URL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'x-automate-secret': process.env.AUTOMATE_SECRET || '',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    console.log('🔑 API EMAIL:', process.env.API_EMAIL);

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
  if (testType === 'ui' || !testType) {
    const browser = await chromium.launch({
      headless: process.env.HEADLESS === 'true',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--start-maximized', '--incognito']
    });

    const context = await browser.newContext({ viewport: null });
    const page    = await context.newPage();

    page.on('console', msg => console.log(`   [browser console:${msg.type()}]`, msg.text()));
    page.on('pageerror', err => console.log('   [browser pageerror]', err.message));

    console.log('🌐 Navigating to:', process.env.BASE_UI_URL);

    try {
      await page.goto(process.env.BASE_UI_URL!, { waitUntil: 'load' });

      await page.getByPlaceholder('Email').fill(process.env.EMAIL!);
      await page.locator('input[name="password"]').fill(process.env.PASSWORD!);
      await page.locator("//button[normalize-space()='Login']").click();
    } catch (err: any) {
      console.log('❌ Login page did not render as expected. Capturing diagnostics...');
      console.log('   Current URL:', page.url());
      console.log('   Page title :', await page.title().catch(() => '(unavailable)'));
      await page.screenshot({ path: 'global-setup-failure.png', fullPage: true }).catch(() => {});
      fs.writeFileSync('global-setup-failure.html', await page.content().catch(() => '(unavailable)'));
      console.log('   📸 Saved global-setup-failure.png and global-setup-failure.html');
      throw err;
    }

    // If tenant-selection dialog appears, select DREAM EVENTS immediately
    try {
      await page.waitForSelector('input[type="radio"]', { timeout: 3000 });
      await page.locator('input[type="radio"]').first().click();
      console.log('✅ Selected DREAM EVENTS');
    } catch {
      console.log('⏭️  No tenant dialog — skipping');
    }

    await page.waitForURL(url => url.toString().includes('#/home'), { timeout: 60000 });
    console.log('📍 Landed on:', page.url());

    console.log('🎉 UI login successful');

    await context.storageState({ path: 'storageState.json' });
    console.log('💾 storageState.json saved');

    await browser.close();
  }
};
