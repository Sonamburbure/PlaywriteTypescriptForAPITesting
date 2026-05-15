import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// ✅ Load ENV based on TEST_TYPE automatically
const envFile =
  process.env.ENV_FILE ||
  (process.env.TEST_TYPE === 'api' ? '.env.prod' : '.env.dev');

dotenv.config({ path: envFile });

console.log('Loaded ENV:', envFile);
console.log('BASE_API_URL:', process.env.BASE_API_URL);
console.log('BASE_UI_URL:', process.env.BASE_UI_URL);
console.log('EMAIL:', process.env.EMAIL);

export default defineConfig({

  testDir: './tests',
  timeout: 120000,
  fullyParallel: false,
  retries: process.env.TEST_TYPE === 'ui' ? 0 : 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'always' }]
  ],

  outputDir: 'test-results',

  globalSetup: './src/global-setup.ts',

  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts/,

      use: {
        baseURL: process.env.BASE_UI_URL,
        storageState: 'storageState.json',
        headless: process.env.HEADLESS !== 'false',
        viewport: null,
        ignoreHTTPSErrors: true,
        screenshot: 'on',
        trace: 'on',
        video: 'on',

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

        actionTimeout: 60000,
        navigationTimeout: 60000
      }
    }
  ],

  workers: 1,
});