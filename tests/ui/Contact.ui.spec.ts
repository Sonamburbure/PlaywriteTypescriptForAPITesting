import { test, expect, Response } from '@playwright/test';
import { ContactPage } from '../../src/pages/ContactPage.js';

// Attach a full-page screenshot to the HTML report whenever a test fails
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
    await testInfo.attach('failure-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    console.log(`Failure screenshot attached — URL at failure: ${page.url()}`);
  }
});

const UK_COUNTIES = ['Avon', 'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire', 'Cheshire'];

const UK_FIRST_NAMES = ['Oliver', 'George', 'Harry', 'Jack', 'Noah', 'Olivia', 'Amelia', 'Isla', 'Ava', 'Emily', 'Sophie', 'Grace', 'Thomas', 'Charlie', 'Henry', 'Ella', 'Mia', 'Ruby', 'Edward', 'Daniel'];
const UK_LAST_NAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Patel', 'Wright', 'Walker', 'White', 'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Martin', 'Clarke', 'Lewis'];
const JOB_TITLES = ['Logistics Specialist', 'Accountant', 'Marketing Lead', 'Operations Manager', 'Customer Service Rep'];

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Logical names only — NO digits anywhere. Guard with /\d/ + used-list uniqueness.
function generateFirstName(used: string[]): string {
  let name = getRand(UK_FIRST_NAMES);
  while (used.includes(name) || /\d/.test(name)) name = getRand(UK_FIRST_NAMES);
  used.push(name);
  return name;
}

function generateLastName(): string {
  const name = getRand(UK_LAST_NAMES);
  if (/\d/.test(name)) return generateLastName();
  return name;
}

function generateNewFirstName(used: string[]): string {
  return generateFirstName(used);
}

// e.g. "Olivia Smith" -> olivia.smith.<unique>@mailinator.com
function emailFor(firstName: string, lastName: string, unique: number): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  return `${clean(firstName)}.${clean(lastName)}.${unique}@mailinator.com`;
}

// 07 + 9 random digits, unique per run — pins the row even if another contact shares the name
function generatePhone(used: string[]): string {
  let phone = `07${Math.floor(100000000 + Math.random() * 900000000)}`;
  while (used.includes(phone) || /\d/.test(phone) === false) {
    phone = `07${Math.floor(100000000 + Math.random() * 900000000)}`;
  }
  used.push(phone);
  return phone;
}

test('Contact UI Test — Create, Search, Edit, Duplicate, View', async ({ page }) => {
  await page.goto(process.env.BASE_UI_URL!);

  const contactPage = new ContactPage(page);

  const unique = Date.now();
  const usedNames: string[] = [];
  const usedPhones: string[] = [];

  const firstName = generateNewFirstName(usedNames);
  const lastName = generateLastName();
  const phone = generatePhone(usedPhones);
  const mobile = generatePhone(usedPhones);

  const contactData = {
    firstName,
    lastName,
    phone,
    email: emailFor(firstName, lastName, unique),
    job: getRand(JOB_TITLES),
    mobile,
    address: '10 Baker Street',
    town: 'London',
    postCode: 'AB12 3CD',
    county: getRand(UK_COUNTIES),
  };

  const isContactSave = (resp: Response) =>
    resp.url().includes('/contact') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  // First name + phone are both list columns; NEVER assert town — not a list column.
  const assertRow = async (name: string, label: string) => {
    const row = contactPage.rowByName(name, contactData.phone);
    await expect.soft(row, `${label}: "${name}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row, `${label}: row should contain first name`).toContainText(name);
    await expect.soft(row, `${label}: row should contain phone`).toContainText(contactData.phone);
  };

  // ── 1. CREATE ──────────────────────────────────────────
  console.log('Creating contact:', contactData.firstName, contactData.lastName);
  const createResPromise = page.waitForResponse(isContactSave, { timeout: 20000 });
  await contactPage.createContact(contactData);
  const createRes = await createResPromise;
  await contactPage.waitForDetailPage();

  const body = await createRes.json();
  const contactId = Array.isArray(body) ? body[0]?.contactid : body?.contactid;
  console.log('Contact ID:', contactId);

  expect.soft(createRes.ok(), 'POST /contact should return 2xx').toBeTruthy();
  expect.soft(contactId, 'contactid should be present in response').toBeTruthy();

  // ── 2. SEARCH ──────────────────────────────────────────
  await contactPage.findContact(contactData.firstName, contactData.phone);
  await expect.soft(contactPage.searchFirstNameInput, 'Search: first-name filter should hold the searched name').toHaveValue(contactData.firstName);
  await assertRow(contactData.firstName, 'Search');
  console.log('Search verified — contact found in list');

  // Clear-search coverage: X icon may be absent, so never fail the chain here
  try {
    await contactPage.clearSearch();
    await expect.soft(contactPage.searchFirstNameInput, 'Clear (X): first-name filter should be cleared').toHaveValue('');
    console.log('Clear search verified — filter cleared');
  } catch (err) {
    console.log('Clear search skipped (X icon absent):', (err as Error).message);
  }

  // ── 3. EDIT (list pencil icon) — rename, phone stays same ──
  const editFirstName = generateNewFirstName(usedNames);

  await contactPage.findContact(contactData.firstName, contactData.phone);
  await contactPage.clickEdit(contactData.firstName, contactData.phone);
  await expect.soft(contactPage.firstName, 'Edit: form should be prefilled with current first name').toHaveValue(contactData.firstName);
  await contactPage.firstName.fill(editFirstName);

  const editResPromise = page.waitForResponse(isContactSave, { timeout: 20000 });
  await contactPage.save();
  expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
  await contactPage.waitForDetailPage();

  await contactPage.findContact(editFirstName, contactData.phone);
  await assertRow(editFirstName, 'Edit');
  console.log(`Edit verified — "${contactData.firstName}" renamed to "${editFirstName}"`);

  // ── 4. DUPLICATE (list copy icon) — town copied, new name ──
  const duplicateFirstName = generateNewFirstName(usedNames);
  const duplicateEmail = emailFor(duplicateFirstName, contactData.lastName, unique);

  await contactPage.clickDuplicate(editFirstName, contactData.phone);
  await expect.soft(contactPage.town, 'Duplicate: town should be copied').toHaveValue(contactData.town);
  await contactPage.firstName.fill(duplicateFirstName);
  await contactPage.primaryEmail.fill(duplicateEmail);

  const dupResPromise = page.waitForResponse(isContactSave, { timeout: 20000 });
  await contactPage.save();
  expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
  await contactPage.waitForDetailPage();

  await contactPage.findContact(duplicateFirstName, contactData.phone);
  await assertRow(duplicateFirstName, 'Duplicate');
  console.log(`Duplicate verified — "${editFirstName}" duplicated as "${duplicateFirstName}"`);

  // ── 5. VIEW (list eye icon) → detail page → Edit button ──
  const viewEditFirstName = generateNewFirstName(usedNames);

  await contactPage.clickView(duplicateFirstName, contactData.phone);

  await expect.soft(page, 'View: should open contact detail page').toHaveURL(/#\/home\/contacts\/detail\/\d+/);
  await expect.soft(page.getByText(duplicateFirstName, { exact: true }).first(), 'View: contact name should be shown').toBeVisible({ timeout: 15000 });

  await contactPage.clickDetailEdit();
  await expect.soft(contactPage.firstName, 'Detail Edit: form should be prefilled with current name').toHaveValue(duplicateFirstName);
  await contactPage.firstName.fill(viewEditFirstName);

  const viewResPromise = page.waitForResponse(isContactSave, { timeout: 20000 });
  await contactPage.save();
  expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
  await contactPage.waitForDetailPage();

  await contactPage.findContact(viewEditFirstName, contactData.phone);
  await assertRow(viewEditFirstName, 'Detail Edit');
  console.log(`View + Edit verified — "${duplicateFirstName}" renamed to "${viewEditFirstName}"`);

  // ── 6. BULK EDIT — tick first 2 rows → Select Actions → Edit Contacts → Assigned To ──
  const newAssignee = /^Sonam Burbure$/;

  await contactPage.navigateToList();
  await expect.soft(page, 'Bulk Edit: should be on Contacts list page').toHaveURL(/#\/home\/contacts$/);
  // Reset the filter via the X icon beside Search so the full list returns
  if (await contactPage.clearSearchBtn.isVisible().catch(() => false)) {
    await contactPage.clearSearch();
    await expect.soft(contactPage.searchFirstNameInput, 'Clear (X): first-name filter should be cleared').toHaveValue('');
    console.log('Filter cleared via X — full contact list restored');
  }
  await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

  const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
  const bulkNames: string[] = [];
  for (const row of firstTwoRows) {
    const name = (await row.locator('td').nth(1).innerText()).trim();
    bulkNames.push(name);

    const checkbox = contactPage.rowCheckbox(row);
    await checkbox.check();
    await expect.soft(checkbox, `Bulk Edit: "${name}" should be ticked`).toBeChecked();
  }
  console.log('Ticked first 2 contacts:', bulkNames.join(' & '));

  await contactPage.chooseBulkAction(/^Edit Contacts?$/);
  await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/contacts\/add-edit/);
  await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

  const assigneeLabel = await contactPage.selectOptionByText(contactPage.assignedTo, newAssignee);
  await expect.soft(contactPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);

  const bulkResPromise = page.waitForResponse(isContactSave, { timeout: 20000 });
  await contactPage.save();
  expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
  console.log(`Bulk Edit saved — Assigned To: "${assigneeLabel}"`);
  console.log(`Contact UI chain complete — created "${contactData.firstName}", edited to "${editFirstName}", duplicated to "${duplicateFirstName}", detail-edited to "${viewEditFirstName}"`);
});
