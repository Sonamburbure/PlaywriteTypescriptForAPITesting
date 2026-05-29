import { test, expect, Response } from '@playwright/test';
import { AccountPage } from '../../src/pages/AccountPage.js';

const UK_COUNTIES = ['Avon', 'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire', 'Cheshire'];

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAccountName(): string {
  const adjectives = ['Golden', 'Silver', 'Royal', 'Elite', 'Prime', 'Grand', 'Noble', 'Stellar', 'Prestige', 'Sapphire', 'Emerald', 'Azure', 'Ivory', 'Onyx', 'Crimson'];
  const nouns      = ['Oak', 'Peak', 'Ridge', 'Vale', 'Grove', 'Bridge', 'Court', 'Manor', 'Park', 'Square', 'Lane', 'Gate', 'Hall', 'Tower', 'House'];
  const suffixes   = ['Ltd', 'Group', '& Co', 'Events', 'Solutions', 'Partners', 'Associates', 'Ventures'];
  return `${getRand(adjectives)} ${getRand(nouns)} ${getRand(suffixes)}`;
}

test('Create Account UI Test', async ({ page }) => {
  await page.goto(process.env.BASE_UI_URL!);

  const accountPage = new AccountPage(page);

  const unique = Date.now();
  const accountData = {
    name:     generateAccountName(),
    phone:    `07${Math.floor(100000000 + Math.random() * 900000000)}`,
    email:    `account.${unique}@mailinator.com`,
    address:  '123 High Street',
    town:     'London',
    postCode: 'SW1A 1AA',
    county:   getRand(UK_COUNTIES),
  };

  console.log('📋 Creating account:', accountData.name);

  await accountPage.createAccount(accountData);

  // ── Assert POST response ──────────────────────────────────
  const response = await page.waitForResponse(
    (resp: Response) =>
      resp.url().includes('/customer') && resp.request().method() === 'POST',
    { timeout: 60000 }
  );

  const body = await response.json();
  console.log('Full response body:', body);

  const customerId = Array.isArray(body) ? body[0]?.customerid : body?.customerid;
  console.log('🎯 Customer ID:', customerId);

  expect(response.ok(), 'POST /customer should return 2xx').toBeTruthy();
  expect(customerId, 'customerid should be present in response').toBeTruthy();

  // ── Navigate back to list and search ─────────────────────
  await accountPage.navigateToList();

  await accountPage.searchAccounts({ name: accountData.name });

  // ── Assert search results contain the created account ────
  const row = page.locator('tbody tr').filter({ hasText: accountData.name });

  await expect(row, `Account "${accountData.name}" should appear in search results`).toBeVisible({ timeout: 15000 });

  const nameCell  = row.locator('td').nth(1);
  const phoneCell = row.locator('td').nth(2);
  const townCell  = row.locator('td').nth(5);

  await expect(nameCell, 'Account name should match').toContainText(accountData.name);
  await expect(phoneCell, 'Phone number should match').toContainText(accountData.phone);
  await expect(townCell, 'Town should match').toContainText(accountData.town);

  console.log('✅ Search verified — account found in list');
});
