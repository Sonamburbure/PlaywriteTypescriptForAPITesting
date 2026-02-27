import { test } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage.js';
import { EMAIL, PASSWORD, BASE_UI_URL } from '../../src/utils/constants.js';

test('UI Login Test', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.navigate(BASE_UI_URL);
  await loginPage.login(EMAIL, PASSWORD);
  await loginPage.waitForHomePage();
});