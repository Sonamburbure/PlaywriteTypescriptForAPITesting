import { test, expect, Response } from '@playwright/test';
import { AccountPage } from '../../src/pages/AccountPage.js';

// Attach a full-page screenshot to the HTML report whenever a test fails
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
    await testInfo.attach('failure-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    console.log(`📸 Failure screenshot attached — URL at failure: ${page.url()}`);
  }
});

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

// Generate a realistic name that differs from all names already used in this run
function generateNewAccountName(used: string[]): string {
  let name = generateAccountName();
  while (used.includes(name)) name = generateAccountName();
  used.push(name);
  return name;
}

// e.g. "Golden Oak Ltd" → info.goldenoakltd.1759061234567@mailinator.com
function emailFor(name: string, unique: number): string {
  return `info.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${unique}@mailinator.com`;
}

test('Account UI Test — Create, Search, Edit, Duplicate, View', async ({ page }) => {
  await page.goto(process.env.BASE_UI_URL!);

  const accountPage = new AccountPage(page);

  const unique = Date.now();
  const usedNames: string[] = [];
  const accountData = {
    name:     generateNewAccountName(usedNames),
    phone:    `07${Math.floor(100000000 + Math.random() * 900000000)}`,
    email:    '',
    address:  '123 High Street',
    town:     'London',
    postCode: 'SW1A 1AA',
    county:   getRand(UK_COUNTIES),
  };
  accountData.email = emailFor(accountData.name, unique);

  const isCustomerSave = (resp: Response) =>
    resp.url().includes('/customer') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  // Phone is unique per run, so it pins the row even if another account shares the name
  const assertRow = async (name: string, label: string) => {
    const row = accountPage.rowByName(name, accountData.phone);
    await expect.soft(row, `${label}: "${name}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row.locator('td').nth(1), `${label}: name should match`).toContainText(name);
    await expect.soft(row.locator('td').nth(2), `${label}: phone should match`).toContainText(accountData.phone);
    await expect.soft(row.locator('td').nth(5), `${label}: town should match`).toContainText(accountData.town);
  };

  // ── 1. CREATE ────────────────────────────────────────────
  console.log('📋 Creating account:', accountData.name);
  const createResPromise = page.waitForResponse(isCustomerSave, { timeout: 60000 });
  await accountPage.createAccount(accountData);
  const createRes = await createResPromise;
  await accountPage.waitForDetailPage();

  const body = await createRes.json();
  const customerId = Array.isArray(body) ? body[0]?.customerid : body?.customerid;
  console.log('🎯 Customer ID:', customerId);

  expect.soft(createRes.ok(), 'POST /customer should return 2xx').toBeTruthy();
  expect.soft(customerId, 'customerid should be present in response').toBeTruthy();

  // ── 2. SEARCH ────────────────────────────────────────────
  await accountPage.findAccount(accountData.name, accountData.phone);
  await assertRow(accountData.name, 'Search');
  console.log('✅ Search verified — account found in list');

  // ── 3. EDIT (list pencil icon) — update account name ─────
  const editName = generateNewAccountName(usedNames);

  await accountPage.clickEdit(accountData.name, accountData.phone);
  await expect.soft(accountPage.accountName, 'Edit: form should be prefilled with current name').toHaveValue(accountData.name);
  await accountPage.accountName.fill(editName);

  const editResPromise = page.waitForResponse(isCustomerSave, { timeout: 60000 });
  await accountPage.save();
  expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
  await accountPage.waitForDetailPage();

  await accountPage.findAccount(editName, accountData.phone);
  await assertRow(editName, 'Edit');
  console.log(`✅ Edit verified — "${accountData.name}" renamed to "${editName}"`);

  // ── 4. DUPLICATE (list copy icon) — update account name ──
  const duplicateName  = generateNewAccountName(usedNames);
  const duplicateEmail = emailFor(duplicateName, unique);

  await accountPage.clickDuplicate(editName, accountData.phone);
  await expect.soft(accountPage.phoneNumber, 'Duplicate: phone should be copied').toHaveValue(accountData.phone);
  await expect.soft(accountPage.town, 'Duplicate: town should be copied').toHaveValue(accountData.town);

  await accountPage.accountName.fill(duplicateName);
  await accountPage.emailAddress.fill(duplicateEmail);

  const dupResPromise = page.waitForResponse(isCustomerSave, { timeout: 60000 });
  await accountPage.save();
  expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
  await accountPage.waitForDetailPage();

  await accountPage.findAccount(duplicateName, accountData.phone);
  await assertRow(duplicateName, 'Duplicate');
  console.log(`✅ Duplicate verified — "${editName}" duplicated as "${duplicateName}"`);

  // ── 5. VIEW (list eye icon) → detail page → Edit button ──
  const viewEditName = generateNewAccountName(usedNames);

  await accountPage.clickView(duplicateName, accountData.phone);

  await expect.soft(page, 'View: should open account detail page').toHaveURL(/#\/home\/accounts\/detail\/\d+/);
  await expect.soft(page.getByText(duplicateName, { exact: true }).first(), 'View: account name should be shown').toBeVisible({ timeout: 15000 });
  await expect.soft(page.getByText(duplicateEmail, { exact: true }), 'View: email should match').toBeVisible();
  await expect.soft(page.getByText(accountData.phone, { exact: true }), 'View: phone should match').toBeVisible();
  await expect.soft(page.getByText(accountData.town, { exact: true }), 'View: town should match').toBeVisible();

  await accountPage.clickDetailEdit();
  await expect.soft(accountPage.accountName, 'Detail Edit: form should be prefilled with current name').toHaveValue(duplicateName);
  await accountPage.accountName.fill(viewEditName);

  const viewResPromise = page.waitForResponse(isCustomerSave, { timeout: 60000 });
  await accountPage.save();
  expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
  await accountPage.waitForDetailPage();

  await accountPage.findAccount(viewEditName, accountData.phone);
  await assertRow(viewEditName, 'Detail Edit');
  console.log(`✅ View + Edit verified — "${duplicateName}" renamed to "${viewEditName}"`);

  // ── 6. BULK EDIT — clear search (X) → tick first 2 rows → Select Actions → Edit Account → Assigned To ──
  const newAssignee = /^Christopher\w* White$/;

  await accountPage.navigateToList();
  await accountPage.searchAccounts({ phone: accountData.phone });
  await accountPage.clearSearch();
  await expect.soft(accountPage.searchPhoneInput, 'Clear (X): phone filter should be cleared').toHaveValue('');

  // Make sure we're on the Accounts list page before ticking checkboxes
  await accountPage.navigateToList();
  await expect.soft(page, 'Bulk Edit: should be on Accounts list page').toHaveURL('https://web.automateevents.com/#/home/accounts');
  await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

  const firstTwoRows = [0, 1].map(i => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
  const bulkNames: string[] = [];
  for (const row of firstTwoRows) {
    const name = (await row.locator('td').nth(1).innerText()).trim();
    bulkNames.push(name);

    const checkbox = accountPage.rowCheckbox(row);
    await checkbox.check();
    await expect.soft(checkbox, `Bulk Edit: "${name}" should be ticked`).toBeChecked();
  }
  console.log('☑️  Ticked first 2 accounts:', bulkNames.join(' & '));

  await accountPage.chooseBulkAction(/^Edit Accounts?$/);
  await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/accounts\/add-edit/);
  await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

  const assigneeLabel = await accountPage.selectOptionByText(accountPage.assignedTo, newAssignee);
  await expect.soft(accountPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);

  const bulkResPromise = page.waitForResponse(isCustomerSave, { timeout: 60000 });
  await accountPage.save();
  expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
  console.log(`💾 Bulk Edit saved — Assigned To: "${assigneeLabel}"`);

  // ── 7. VERIFY — filter list by Assigned To (plus name, so each account is on page 1) ──
  for (const name of bulkNames) {
    await accountPage.searchByAssignedTo(newAssignee, { name });
    const row = page.locator('tbody tr').filter({ hasText: name }).first();
    await expect.soft(row, `Assigned To filter: "${name}" should be listed`).toBeVisible({ timeout: 15000 });
    await expect.soft(row.locator('td').nth(4), `"${name}" should be assigned to ${assigneeLabel}`).toHaveText(assigneeLabel);
  }
  console.log(`✅ Bulk Edit verified — ${bulkNames.join(' & ')} assigned to "${assigneeLabel}"`);
});
