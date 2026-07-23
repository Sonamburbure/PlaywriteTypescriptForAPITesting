import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Auto-detect env file from spec pattern when ENV_FILE not set
const args = process.argv.join(' ');
const defaultEnv = args.includes('.api.spec') ? '.env.dev' : args.includes('.ui.spec') ? '.env.stage' : '.env.stage';
const envFile = process.env.ENV_FILE || defaultEnv;

// Persist so worker processes (which don't have the test file in argv) inherit the correct env
process.env.ENV_FILE = envFile;

dotenv.config({ path: envFile, override: true });

console.log('Loaded ENV:', envFile);
console.log('BASE_API_URL:', process.env.BASE_API_URL);
console.log('BASE_UI_URL:', process.env.BASE_UI_URL);
console.log('EMAIL:', process.env.EMAIL);

export default defineConfig({

  testDir: './tests',
  timeout: 600000,
  fullyParallel: false,
  retries: 0,

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
      use: {
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts/,

      use: {
        baseURL: process.env.BASE_UI_URL,
        storageState: 'storageState.json',
        headless: process.env.HEADLESS === 'true',
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