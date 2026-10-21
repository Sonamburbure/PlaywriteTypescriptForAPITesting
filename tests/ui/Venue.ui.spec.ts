import { test, expect, Response } from '@playwright/test';
import { VenuePage } from '../../src/pages/VenuePage.js';

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

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVenueName(): string {
  const prefixes = ['Grand', 'Royal', 'Classic', 'Heritage', 'Modern', 'Riverside', 'Central', 'Parkside'];
  const cores = ['Hall', 'Lodge', 'Manor', 'House', 'Gardens', 'Suite', 'Arena', 'Pavilion'];
  const suffixes = ['Events', 'Venue', 'Suites', 'Collection', 'Spaces'];
  const places = ['Harrow', 'Camden', 'Birchwood', 'Ashford', 'Kingsbury', 'Wembley', 'Richmond', 'Greenwich', 'Kensington', 'Bromley', 'Croydon', 'Ealing', 'Barnet', 'Enfield', 'Sutton', 'Ilford', 'Stratford', 'Watford', 'Luton', 'Reading'];
  const prefix = getRand(prefixes);
  const core = getRand(cores);
  const suffix = getRand(suffixes);
  const place = getRand(places);
  let secondCore = getRand(cores);
  while (secondCore === core) secondCore = getRand(cores);
  const candidates = [`${prefix} ${core} ${suffix}`, `${prefix} ${core} ${place} ${suffix}`, `${prefix} ${place} ${suffix}`, `${place} ${core} ${suffix}`, `${prefix} ${core} ${secondCore} ${suffix}`];
  const name = getRand(candidates);
  if (/\d/.test(name)) return generateVenueName();
  return name;
}

// Generate a realistic name that differs from all names already used in this run
function generateNewVenueName(used: string[]): string {
  let name = generateVenueName();
  while (used.includes(name) || /\d/.test(name)) name = generateVenueName();
  used.push(name);
  return name;
}

function generatePhone(): string {
  let digits = '';
  for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10);
  return `07${digits}`;
}

function generateEmail(): string {
  return `venue.${Date.now()}${Math.floor(Math.random() * 100000)}@mailinator.com`;
}

test('Venue UI Test — Create, Search, Edit, Duplicate, View', async ({ page }) => {
  await page.goto(process.env.BASE_UI_URL!);

  const venuePage = new VenuePage(page);

  const usedNames: string[] = [];
  const venueData = {
    name: generateNewVenueName(usedNames),
    phone: generatePhone(),
    email: generateEmail(),
    address: '123 High Street',
    town: 'London',
    postCode: 'SW1A 1AA',
    county: getRand(UK_COUNTIES),
  };

  const isVenueSave = (resp: Response) =>
    resp.url().includes('/venue') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (name: string, label: string) => {
    const row = venuePage.rowByName(name);
    await expect.soft(row, `${label}: "${name}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row, `${label}: row should contain name`).toContainText(name);
  };

  // -- 1. CREATE -----------------------------------------
  console.log('Creating venue:', venueData.name);
  const createResPromise = page.waitForResponse(isVenueSave, { timeout: 20000 });
  await venuePage.createVenue(venueData);
  const createRes = await createResPromise;
  await venuePage.waitForDetailPage();

  const body = await createRes.json();
  const venueId = Array.isArray(body) ? body[0]?.venueid : body?.venueid;
  console.log('Venue ID:', venueId);

  expect.soft(createRes.ok(), 'POST /venue should return 2xx').toBeTruthy();
  expect.soft(venueId, 'venueid should be present in response').toBeTruthy();

  // -- 2. SEARCH -----------------------------------------
  await venuePage.findVenue(venueData.name, venueData.phone);
  await expect.soft(venuePage.searchNameInput, 'Search: name filter should hold the searched name').toHaveValue(venueData.name);
  await assertRow(venueData.name, 'Search');
  console.log('Search verified — venue found in list');

  // Clear-search coverage: X icon may be absent, so never fail the chain here
  try {
    await venuePage.clearSearch();
    await expect.soft(venuePage.searchNameInput, 'Clear (X): name filter should be cleared').toHaveValue('');
    console.log('Clear search verified — filter cleared');
  } catch (err) {
    console.log('Clear search skipped (X icon absent):', (err as Error).message);
  }

  // -- 3. EDIT (list pencil icon) — update venue name ---
  const editName = generateNewVenueName(usedNames);

  await venuePage.findVenue(venueData.name, venueData.phone);
  await venuePage.clickEdit(venueData.name, venueData.phone);
  await expect.soft(venuePage.venueName, 'Edit: form should be prefilled with current name').toHaveValue(venueData.name);
  await venuePage.venueName.fill(editName);

  const editResPromise = page.waitForResponse(isVenueSave, { timeout: 20000 });
  await venuePage.save();
  expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
  await venuePage.waitForDetailPage();

  await venuePage.findVenue(editName, venueData.phone);
  await assertRow(editName, 'Edit');
  console.log(`Edit verified — "${venueData.name}" renamed to "${editName}"`);

  // -- 4. DUPLICATE (list copy icon) — update venue name --
  const duplicateName = generateNewVenueName(usedNames);
  const duplicateEmail = generateEmail();

  await venuePage.clickDuplicate(editName, venueData.phone);
  await expect.soft(venuePage.streetAddress, 'Duplicate: address should be copied').toHaveValue(venueData.address);
  await venuePage.venueName.fill(duplicateName);
  await venuePage.venueEmail.fill(duplicateEmail);

  const dupResPromise = page.waitForResponse(isVenueSave, { timeout: 20000 });
  await venuePage.save();
  expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
  await venuePage.waitForDetailPage();

  await venuePage.findVenue(duplicateName, venueData.phone);
  await assertRow(duplicateName, 'Duplicate');
  console.log(`Duplicate verified — "${editName}" duplicated as "${duplicateName}"`);

  // -- 5. VIEW (list eye icon) ? detail page ? Edit button --
  const viewEditName = generateNewVenueName(usedNames);

  await venuePage.clickView(duplicateName, venueData.phone);

  await expect.soft(page, 'View: should open venue detail page').toHaveURL(/#\/home\/venues\/detail\/\d+/);
  await expect.soft(page.getByText(duplicateName, { exact: true }).first(), 'View: venue name should be shown').toBeVisible({ timeout: 15000 });

  await venuePage.clickDetailEdit();
  await expect.soft(venuePage.venueName, 'Detail Edit: form should be prefilled with current name').toHaveValue(duplicateName);
  await venuePage.venueName.fill(viewEditName);

  const viewResPromise = page.waitForResponse(isVenueSave, { timeout: 20000 });
  await venuePage.save();
  expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
  await venuePage.waitForDetailPage();

  await venuePage.findVenue(viewEditName, venueData.phone);
  await assertRow(viewEditName, 'Detail Edit');
  console.log(`View + Edit verified — "${duplicateName}" renamed to "${viewEditName}"`);

  // -- 6. BULK EDIT — tick first 2 rows ? Select Actions ? Edit Venues ? Assigned To --
  const newAssignee = /^Sonam Burbure$/;

  await venuePage.navigateToList();
  await expect.soft(page, 'Bulk Edit: should be on Venues list page').toHaveURL(/#\/home\/venues$/);
  // Reset the name filter via the X icon beside Search so the full list returns
  if (await venuePage.clearSearchBtn.isVisible().catch(() => false)) {
    await venuePage.clearSearch();
    await expect.soft(venuePage.searchNameInput, 'Clear (X): name filter should be cleared').toHaveValue('');
    console.log('Filter cleared via X — full venue list restored');
  }
  await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

  const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
  const bulkNames: string[] = [];
  for (const row of firstTwoRows) {
    const name = (await row.locator('td').nth(1).innerText()).trim();
    bulkNames.push(name);

    const checkbox = venuePage.rowCheckbox(row);
    await checkbox.check();
    await expect.soft(checkbox, `Bulk Edit: "${name}" should be ticked`).toBeChecked();
  }
  console.log('Ticked first 2 venues:', bulkNames.join(' & '));

  await venuePage.chooseBulkAction(/^Edit Venues?$/);
  await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/venues\/add-edit/);
  await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

  const assigneeLabel = await venuePage.selectOptionByText(venuePage.assignedTo, newAssignee);
  await expect.soft(venuePage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);

  const bulkResPromise = page.waitForResponse(isVenueSave, { timeout: 20000 });
  await venuePage.save();
  expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
  console.log(`Bulk Edit saved — Assigned To: "${assigneeLabel}"`);
  console.log(`Venue UI chain complete — created "${venueData.name}", edited to "${editName}", duplicated to "${duplicateName}", detail-edited to "${viewEditName}"`);
});
