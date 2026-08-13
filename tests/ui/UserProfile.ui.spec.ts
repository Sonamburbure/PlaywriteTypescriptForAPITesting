import { test, expect, Response } from '@playwright/test';
import { UserPage } from '../../src/pages/UserPage.js';
import { LoginPage } from '../../src/pages/LoginPage.js';

const FIRST_NAMES = [
  'James', 'Oliver', 'Michael', 'Daniel', 'William',
  'Emma', 'Olivia', 'Sarah', 'Emily', 'Charlotte',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor',
  'Davies', 'Wilson', 'Evans', 'Walker', 'Anderson',
];

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EXPECTED_MODULES = [
  'Home',
  'Calendar',
  'Third Parties',
  'Sales',
  'Event Management',
  'Orders & Invoices',
  'Stock Management',
  'Human Resources',
  'Event Management Details',
  'Event Setups',
  'Resource Setups',
  'CPQ Setups',
  'Reports',
  'User',
];

test('User profile - create user and verify menu modules', async ({ browser }, testInfo) => {
  const unique = Date.now();
  const userData = {
    firstName: getRand(FIRST_NAMES),
    lastName: getRand(LAST_NAMES),
    email: `user.${unique}@mailinator.com`,
    password: 'Test@1234',
  };

  console.log('📋 Creating user:', userData.email);

  // ── Create the user using the existing admin session ─────
  const adminContext = await browser.newContext({
    storageState: 'storageState.json',
    recordVideo: { dir: testInfo.outputDir },
  });
  const adminPage = await adminContext.newPage();
  const userPage = new UserPage(adminPage);

  const responsePromise = adminPage.waitForResponse(
    (resp: Response) => resp.request().method() === 'POST',
    { timeout: 30000 }
  );

  await userPage.createUser(userData);

  const response = await responsePromise;
  console.log('🔍 Create User request URL:', response.url());
  console.log('🔍 Create User response status:', response.status());
  expect(response.ok(), 'Create user POST should return 2xx').toBeTruthy();

  const body = await response.json();
  console.log('Full response body:', body);
  expect(body.token, 'response should include an auth token').toBeTruthy();

  // ── Verify the saved record matches what was submitted ────
  await userPage.navigateToList();
  await userPage.searchByEmail(userData.email);

  const row = adminPage.locator('tbody tr').filter({ hasText: userData.email });
  await expect(row, `User "${userData.email}" should appear in the list`).toBeVisible({ timeout: 15000 });

  const firstNameCell = row.locator('td').nth(1);
  const lastNameCell  = row.locator('td').nth(2);
  const emailCell     = row.locator('td').nth(3);

  await expect(firstNameCell, 'First Name column should match request').toContainText(userData.firstName);
  await expect(lastNameCell, 'Last Name column should match request').toContainText(userData.lastName);
  await expect(emailCell, 'Email column should match request').toContainText(userData.email);

  console.log('✅ Saved user record verified against submitted data');

  await adminContext.close();
  const adminVideoPath = await adminPage.video()?.path();
  if (adminVideoPath) {
    await testInfo.attach('admin-session', { path: adminVideoPath, contentType: 'video/webm' });
  }

  // ── Log in as the newly created user ──────────────────────
  const newUserContext = await browser.newContext({
    recordVideo: { dir: testInfo.outputDir },
  });
  const newUserPage = await newUserContext.newPage();
  const loginPage = new LoginPage(newUserPage);

  await newUserPage.goto(process.env.BASE_UI_URL!, { waitUntil: 'load' });
  await loginPage.login(userData.email, userData.password);

  await newUserPage.waitForURL(url => url.toString().includes('#/home'), { timeout: 60000 });
  console.log('🎉 Logged in as new user:', userData.email);
  await newUserPage.waitForLoadState('networkidle');

  // ── Open the menu and report availability of every module ─
  // The menu drawer can close again within a few hundred ms, so
  // open it and read its text in the same round-trip, retrying if
  // it closed before "Home" showed up in the captured text.
  let menuText = '';
  for (let attempt = 1; attempt <= 5 && !menuText.includes('Home'); attempt++) {
    await loginPage.openMenu();
    menuText = await newUserPage.evaluate(() => document.body.innerText);
    if (!menuText.includes('Home')) {
      console.log(`⏳ Menu closed before it could be read (attempt ${attempt}), retrying...`);
      await newUserPage.keyboard.press('Escape').catch(() => {});
      await newUserPage.waitForTimeout(300);
    }
  }

  console.log('📋 Module availability for role "User":');
  const visibleModules: string[] = [];
  for (const moduleName of EXPECTED_MODULES) {
    const visible = menuText.includes(moduleName);
    console.log(`   ${visible ? '✅' : '❌'} ${moduleName}`);
    if (visible) visibleModules.push(moduleName);
    expect.soft(visible, `"${moduleName}" module should be visible in menu`).toBeTruthy();
  }
  expect.soft(
    visibleModules.length,
    `Expected all ${EXPECTED_MODULES.length} modules visible, but received only ${visibleModules.length}: [${visibleModules.join(', ')}]`
  ).toBe(EXPECTED_MODULES.length);

  await newUserPage.keyboard.press('Escape');
  await newUserPage.waitForTimeout(500);

  // ── Reproduce: Third Parties → Accounts / Contacts 500 error ─
  const serverErrors: string[] = [];
  newUserPage.on('response', resp => {
    if (resp.status() === 500) {
      serverErrors.push(`${resp.request().method()} ${resp.url()} → 500`);
    }
  });

  await loginPage.openMenu();
  await newUserPage.getByText('Third Parties', { exact: true }).click();

  const accountsResponsePromise = newUserPage
    .waitForResponse(resp => resp.url().includes('listview') && resp.url().includes('module=customer'), { timeout: 10000 })
    .catch(() => null);

  const accountsClicked = await newUserPage.getByText('Accounts', { exact: true })
    .click({ force: true, timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  expect.soft(accountsClicked, 'Should be able to click Accounts under Third Parties').toBeTruthy();

  const accountsResponse = await accountsResponsePromise;
  if (accountsResponse) {
    console.log(`🔍 Accounts listview status: expected 200, received ${accountsResponse.status()}`);
    expect.soft(accountsResponse.status(), `Accounts listview: expected 200, received ${accountsResponse.status()}`).toBe(200);
  }
  await newUserPage.waitForTimeout(1000);
  await testInfo.attach('after-clicking-accounts', {
    body: await newUserPage.screenshot(),
    contentType: 'image/png',
  });

  // Accounts navigation closes the menu, so reopen Third Parties before Contacts
  await newUserPage.keyboard.press('Escape');
  await newUserPage.waitForTimeout(500);
  await loginPage.openMenu();
  await newUserPage.getByText('Third Parties', { exact: true }).click();

  const contactsResponsePromise = newUserPage
    .waitForResponse(resp => resp.url().includes('listview') && resp.url().includes('module=contact'), { timeout: 10000 })
    .catch(() => null);

  const contactsClicked = await newUserPage.getByText('Contacts', { exact: true })
    .click({ force: true, timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  expect.soft(contactsClicked, 'Should be able to click Contacts under Third Parties').toBeTruthy();

  const contactsResponse = await contactsResponsePromise;
  if (contactsResponse) {
    console.log(`🔍 Contacts listview status: expected 200, received ${contactsResponse.status()}`);
    expect.soft(contactsResponse.status(), `Contacts listview: expected 200, received ${contactsResponse.status()}`).toBe(200);
  }
  await newUserPage.waitForTimeout(1000);
  await testInfo.attach('after-clicking-contacts', {
    body: await newUserPage.screenshot(),
    contentType: 'image/png',
  });

  // ── Check whether the menu still shows modules afterward ──
  await newUserPage.keyboard.press('Escape');
  await newUserPage.waitForTimeout(500);
  await loginPage.openMenu();
  const menuStillWorks = await newUserPage.getByText('Home', { exact: true }).isVisible().catch(() => false);
  console.log(menuStillWorks
    ? '✅ Menu still shows modules after visiting Third Parties → Accounts/Contacts'
    : '❌ BUG: menu shows no modules after visiting Third Parties → Accounts/Contacts');

  expect.soft(serverErrors.length, `Expected no 500 errors, got: ${serverErrors.join('; ')}`).toBe(0);
  expect.soft(menuStillWorks, 'Menu should still show modules after visiting Account/Contact').toBeTruthy();

  // ── Logout ─────────────────────────────────────────────────
  await newUserPage.keyboard.press('Escape');
  await newUserPage.waitForTimeout(500);

  await newUserPage.getByText(`${userData.firstName} ${userData.lastName}`, { exact: true }).click();
  await newUserPage.getByText('Logout', { exact: true }).click();
  console.log('👋 Logged out');

  await newUserContext.close();
  const newUserVideoPath = await newUserPage.video()?.path();
  if (newUserVideoPath) {
    await testInfo.attach('new-user-session', { path: newUserVideoPath, contentType: 'video/webm' });
  }
});
