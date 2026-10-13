import { test, expect, Response } from '@playwright/test';
import { SupplierPage } from '../../src/pages/SupplierPage.js';

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

function generateSupplierName(): string {
  const adjectives = ['Golden', 'Silver', 'Royal', 'Elite', 'Prime', 'Grand', 'Noble', 'Stellar', 'Prestige', 'Sapphire', 'Emerald', 'Azure', 'Ivory', 'Onyx', 'Crimson', 'Heritage', 'Sterling', 'Verdant', 'Amber', 'Harvest', 'Classic', 'Superior'];
  const nouns = ['Oak', 'Peak', 'Ridge', 'Vale', 'Grove', 'Bridge', 'Court', 'Manor', 'Park', 'Square', 'Lane', 'Gate', 'Hall', 'Tower', 'House', 'Meadow', 'Brook', 'Farm', 'Orchard', 'Field'];
  const suffixes = ['Ltd', 'Group', '& Co', 'Events', 'Supplies', 'Catering', 'Foods', 'Produce', 'Logistics', 'Wholesale', 'Distribution', 'Services'];
  const places = ['Harrow', 'Camden', 'Birchwood', 'Ashford', 'Kingsbury', 'Wembley', 'Richmond', 'Greenwich', 'Kensington', 'Bromley', 'Croydon', 'Ealing', 'Barnet', 'Enfield', 'Sutton', 'Ilford', 'Stratford', 'Watford', 'Luton', 'Reading'];
  const adj = getRand(adjectives);
  const noun = getRand(nouns);
  const suffix = getRand(suffixes);
  const place = getRand(places);
  let secondNoun = getRand(nouns);
  while (secondNoun === noun) secondNoun = getRand(nouns);
  const candidates = [`${adj} ${noun} ${suffix}`, `${adj} ${noun} ${place} ${suffix}`, `${adj} ${place} ${suffix}`, `${place} ${noun} ${suffix}`, `${adj} ${noun} ${secondNoun} ${suffix}`];
  const name = getRand(candidates);
  if (/\d/.test(name)) return generateSupplierName();
  return name;
}

// Generate a realistic name that differs from all names already used in this run
function generateNewSupplierName(used: string[]): string {
  let name = generateSupplierName();
  while (used.includes(name) || /\d/.test(name)) name = generateSupplierName();
  used.push(name);
  return name;
}

test('Supplier UI Test — Create, Search, Edit, Duplicate, View', async ({ page }) => {
  await page.goto(process.env.BASE_UI_URL!);

  const supplierPage = new SupplierPage(page);

  const usedNames: string[] = [];
  const supplierData = {
    name: generateNewSupplierName(usedNames),
    status: /^Active$/,
    address: '123 High Street',
    town: 'London',
    postCode: 'SW1A 1AA',
    county: getRand(UK_COUNTIES),
  };

  const isSupplierSave = (resp: Response) =>
    resp.url().includes('/supplier') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (name: string, label: string) => {
    const row = supplierPage.rowByName(name);
    await expect.soft(row, `${label}: "${name}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row, `${label}: row should contain name`).toContainText(name);
    await expect.soft(row, `${label}: row should show Active status`).toContainText('Active');
  };

  // ── 1. CREATE ────────────────────────────────────────────
  console.log('📋 Creating supplier:', supplierData.name);
  const createResPromise = page.waitForResponse(isSupplierSave, { timeout: 20000 });
  await supplierPage.createSupplier(supplierData);
  const createRes = await createResPromise;
  await supplierPage.waitForDetailPage();

  const body = await createRes.json();
  const supplierId = Array.isArray(body) ? body[0]?.supplierid : body?.supplierid;
  console.log('🎯 Supplier ID:', supplierId);

  expect.soft(createRes.ok(), 'POST /supplier should return 2xx').toBeTruthy();
  expect.soft(supplierId, 'supplierid should be present in response').toBeTruthy();

  // ── 2. SEARCH ────────────────────────────────────────────
  await supplierPage.findSupplier(supplierData.name);
  await expect.soft(supplierPage.searchNameInput, 'Search: name filter should hold the searched name').toHaveValue(supplierData.name);
  await assertRow(supplierData.name, 'Search');
  console.log('✅ Search verified — supplier found in list');

  // Clear-search coverage: X icon may be absent, so never fail the chain here
  try {
    await supplierPage.clearSearch();
    await expect.soft(supplierPage.searchNameInput, 'Clear (X): name filter should be cleared').toHaveValue('');
    console.log('🧹 Clear search verified — filter cleared');
  } catch (err) {
    console.log('⚠️ Clear search skipped (X icon absent):', (err as Error).message);
  }

  // ── 3. EDIT (list pencil icon) — update supplier name ─────
  const editName = generateNewSupplierName(usedNames);

  await supplierPage.findSupplier(supplierData.name);
  await supplierPage.clickEdit(supplierData.name);
  await expect.soft(supplierPage.supplierName, 'Edit: form should be prefilled with current name').toHaveValue(supplierData.name);
  await supplierPage.supplierName.fill(editName);

  const editResPromise = page.waitForResponse(isSupplierSave, { timeout: 20000 });
  await supplierPage.save();
  expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
  await supplierPage.waitForDetailPage();

  await supplierPage.findSupplier(editName);
  await assertRow(editName, 'Edit');
  console.log(`✅ Edit verified — "${supplierData.name}" renamed to "${editName}"`);
  
  // -- 4. DUPLICATE (list copy icon) � update supplier name --
  const duplicateName = generateNewSupplierName(usedNames);
  
  await supplierPage.clickDuplicate(editName);
  await expect.soft(supplierPage.town, 'Duplicate: town should be copied').toHaveValue(supplierData.town);
  await supplierPage.supplierName.fill(duplicateName);
  
  const dupResPromise = page.waitForResponse(isSupplierSave, { timeout: 20000 });
  await supplierPage.save();
  expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
  await supplierPage.waitForDetailPage();
  
  await supplierPage.findSupplier(duplicateName);
  await assertRow(duplicateName, 'Duplicate');
  console.log(`? Duplicate verified � "${editName}" duplicated as "${duplicateName}"`);
  
  // -- 5. VIEW (list eye icon) ? detail page ? Edit button --
  const viewEditName = generateNewSupplierName(usedNames);
  
  await supplierPage.clickView(duplicateName);
  
  await expect.soft(page, 'View: should open supplier detail page').toHaveURL(/#\/home\/suppliers\/detail\/\d+/);
  await expect.soft(page.getByText(duplicateName, { exact: true }).first(), 'View: supplier name should be shown').toBeVisible({ timeout: 15000 });
  await expect.soft(page.getByText(supplierData.town, { exact: true }), 'View: town should match').toBeVisible();
  
  await supplierPage.clickDetailEdit();
  await expect.soft(supplierPage.supplierName, 'Detail Edit: form should be prefilled with current name').toHaveValue(duplicateName);
  await supplierPage.supplierName.fill(viewEditName);
  
  const viewResPromise = page.waitForResponse(isSupplierSave, { timeout: 20000 });
  await supplierPage.save();
  expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
  await supplierPage.waitForDetailPage();
  
  await supplierPage.findSupplier(viewEditName);
  await assertRow(viewEditName, 'Detail Edit');
  console.log(`? View + Edit verified � "${duplicateName}" renamed to "${viewEditName}"`);
  
  // -- 6. BULK EDIT � tick first 2 rows ? Select Actions ? Edit Suppliers ? Assigned To --
  const newAssignee = /^Sonam Burbure$/;
  
  await supplierPage.navigateToList();
  await expect.soft(page, 'Bulk Edit: should be on Suppliers list page').toHaveURL(/#\/home\/suppliers$/);
  // Reset the name filter via the X icon beside Search so the full list returns
  if (await supplierPage.clearSearchBtn.isVisible().catch(() => false)) {
    await supplierPage.clearSearch();
    await expect.soft(supplierPage.searchNameInput, 'Clear (X): name filter should be cleared').toHaveValue('');
    console.log('Filter cleared via X � full supplier list restored');
  }
  await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });
  
  const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
  const bulkNames: string[] = [];
  for (const row of firstTwoRows) {
    const name = (await row.locator('td').nth(1).innerText()).trim();
    bulkNames.push(name);
  
    const checkbox = supplierPage.rowCheckbox(row);
    await checkbox.check();
    await expect.soft(checkbox, `Bulk Edit: "${name}" should be ticked`).toBeChecked();
  }
  console.log('??  Ticked first 2 suppliers:', bulkNames.join(' & '));
  
  await supplierPage.chooseBulkAction(/^Edit Suppliers?$/);
  await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/suppliers\/add-edit/);
  await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();
  
  const assigneeLabel = await supplierPage.selectOptionByText(supplierPage.assignedTo, newAssignee);
  await expect.soft(supplierPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);
  
  const bulkResPromise = page.waitForResponse(isSupplierSave, { timeout: 20000 });
  await supplierPage.save();
  expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
  console.log(`?? Bulk Edit saved � Assigned To: "${assigneeLabel}"`);
  console.log(`? Supplier UI chain complete � created "${supplierData.name}", edited to "${editName}", duplicated to "${duplicateName}", detail-edited to "${viewEditName}"`);
});
