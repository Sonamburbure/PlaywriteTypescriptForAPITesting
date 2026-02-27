import dotenv from 'dotenv';

// ✅ Load environment FIRST
dotenv.config({
  path: process.env.ENV_FILE || '.env.prod'
});

import type { PlaywrightTestConfig } from '@playwright/test';

console.log('Loaded ENV:', process.env.ENV_FILE || '.env.prod');
console.log('BASE_UI_URL:', process.env.BASE_UI_URL);
console.log('EMAIL:', process.env.EMAIL);

const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30000,

  retries: process.env.TEST_TYPE === 'ui' ? 0 : 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],

  globalSetup: './src/global-setup.ts',

  projects: [
    {
      name: 'api',
      testMatch: /.*api.*\.spec\.ts/,
    },
    {
      name: 'ui',
      testMatch: /.*ui.*\.spec\.ts/,
    },
  ],

  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  workers: process.env.TEST_TYPE === 'ui' ? 1 : undefined,
};

export default config;