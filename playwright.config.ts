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
  timeout: 120000, // Increased timeout for Jenkins slow load
  fullyParallel: false,
  retries: process.env.TEST_TYPE === 'ui' ? 0 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]
  ],

  // ✅ Ensure artifacts are stored
  outputDir: 'test-results',

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

        // ✅ Increase viewport for headless Jenkins
        viewport: { width: 1920, height: 1080 },

        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',

        // ✅ Headless / Jenkins friendly launch args
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-notifications',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--start-maximized',
            '--window-size=1920,1080'
          ]
        },

        // ✅ Force stable interaction in headless
        actionTimeout: 60000,
        navigationTimeout: 60000
      }
    }
  ],

  // Prevent multiple browsers for UI
  workers: process.env.TEST_TYPE === 'ui' ? 1 : undefined,
};

export default config;