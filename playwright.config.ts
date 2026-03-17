import dotenv from 'dotenv';
import type { PlaywrightTestConfig } from '@playwright/test';

// Load environment variables
dotenv.config({
  path: process.env.ENV_FILE || '.env.prod'
});

console.log('Loaded ENV:', process.env.ENV_FILE || '.env.prod');
console.log('BASE_UI_URL:', process.env.BASE_UI_URL);
console.log('EMAIL:', process.env.EMAIL);

const config: PlaywrightTestConfig = {

  testDir: './tests',

  timeout: 60000,

  fullyParallel: false,

  retries: process.env.TEST_TYPE === 'ui' ? 0 : 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]
  ],

  // Login once before all tests
  globalSetup: './src/global-setup.ts',

  projects: [

    // ---------------- API PROJECT ----------------
    {
      name: 'api',
      testMatch: /.*api.*\.spec\.ts/,
    },

    // ---------------- UI PROJECT ----------------
    {
      name: 'ui',
      testMatch: /.*ui.*\.spec\.ts/,

      use: {
        baseURL: process.env.BASE_UI_URL,

        // Reuse login session
        storageState: 'storageState.json',

        headless: process.env.HEADLESS !== 'false',

        viewport: { width: 1280, height: 720 },

        ignoreHTTPSErrors: true,

        screenshot: 'only-on-failure',

        trace: 'retain-on-failure',

        video: 'retain-on-failure'
      }
    }
  ],

  // Prevent multiple browsers for UI
  workers: process.env.TEST_TYPE === 'ui' ? 1 : undefined,

};

export default config;