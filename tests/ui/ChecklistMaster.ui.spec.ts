import { test, expect, Response } from '@playwright/test';
import { ChecklistMasterPage } from '../../src/pages/ChecklistMasterPage.js';

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

// Logical titles only, NO digits, NO Date.now suffix
const TITLE_PREFIXES = ['Morning', 'Evening', 'Venue', 'Safety', 'Guest', 'Vendor', 'Setup', 'Closing', 'Pre-Event', 'Post-Event'];
const TITLE_NAMES = ['Walkthrough', 'Briefing', 'Inspection', 'Checklist', 'Review', 'Audit', 'Handover', 'Sign-off', 'Verification', 'Orientation'];

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNewChecklistTitle(used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const name = `${getRand(TITLE_PREFIXES)} ${getRand(TITLE_NAMES)}`;
    if (!used.has(name) && !/\d/.test(name)) {
      used.add(name);
      return name;
    }
  }
  for (const prefix of TITLE_PREFIXES) {
    for (const task of TITLE_NAMES) {
      const name = `${prefix} ${task}`;
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
  }
  throw new Error('Exhausted title pool — all prefix/name combinations used');
}

test('Checklist Master UI Test — Create, Search, Edit, Duplicate, View', async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_UI_URL!);

  const checklistMasterPage = new ChecklistMasterPage(page);
  const usedNames = new Set<string>();

  const checklistTitle = generateNewChecklistTitle(usedNames);

  const isChecklistMasterSave = (resp: Response) =>
    (resp.url().includes('/checklistmaster') || resp.url().includes('/checklist-master')) &&
    ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (name: string, label: string) => {
    const row = checklistMasterPage.rowByName(name);
    await expect.soft(row, `${label}: "${name}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row, `${label}: row should contain name`).toContainText(name);
  };

  // Soft-step runner: a bug in one step is LOGGED but never aborts the chain.
  // Soft asserts still mark the test failed at the end, so bugs stay visible.
  const stepFailed: string[] = [];
  async function step(label: string, fn: () => Promise<void>) {
    // Page died (e.g. browser/context closed mid-chain) — log once and skip,
    // instead of burning a timeout in every remaining step.
    if (page.isClosed()) {
      console.log(`Bug logged, continuing — ${label} skipped: page already closed`);
      expect.soft(false, `${label} step skipped: page already closed`).toBeTruthy();
      stepFailed.push(label);
      return;
    }
    try {
      await fn();
    } catch (err) {
      const shot = (err as any)?.screenshot;
      if (shot) await testInfo.attach(`validation-error-${label}`, { body: shot, contentType: 'image/png' }).catch(() => {});
      const msg = (err as Error).message.split('\n')[0];
      const frames = ((err as Error).stack || '').split('\n').slice(1, 5).join('\n');
      console.log(`Bug logged, continuing — ${label} failed: ${msg}`);
      if (frames) console.log(frames);
      expect.soft(false, `${label} step failed: ${msg}`).toBeTruthy();
      stepFailed.push(label);
    }
  }

  let editName = '';
  let duplicateName = '';
  let viewEditName = '';
  let bulkNames: string[] = [];
  let bulkAssigneeLabel = '';
  const bulkAssigneeRe = /^Sonam Burbure$/;

  // -- 1. CREATE -----------------------------------------
  await step('CREATE', async () => {
    console.log(`Creating checklist master — title: ${checklistTitle}`);
    await checklistMasterPage.navigateToList();
    await checklistMasterPage.clickCreate();

    await checklistMasterPage.title.fill(checklistTitle);
    try {
      const typeLabel = await checklistMasterPage.selectRandomOption(checklistMasterPage.type);
      console.log(`Checklist type (random): ${typeLabel}`);
    } catch (err) {
      console.log('Checklist type skipped:', (err as Error).message.split('\n')[0]);
    }
    // assign_to left as default Sonam Burbure. Ref is AUTO GENERATED — never fill.

    const createResPromise = page.waitForResponse(isChecklistMasterSave, { timeout: 20000 });
    await checklistMasterPage.save();
    const createRes = await createResPromise;
    await checklistMasterPage.waitForDetailPage();

    const body = await createRes.json().catch(() => ({}));
    const checklistMasterId = body?.checklistmasterid ?? body?.id ?? body?.[0]?.checklistmasterid ?? body?.[0]?.id;
    console.log('Checklist Master ID:', checklistMasterId);

    expect.soft(createRes.ok(), 'POST /checklistmaster should return 2xx').toBeTruthy();
    expect.soft(checklistMasterId, 'checklistmasterid should be present in response').toBeTruthy();
    // Record must exist after Save: detail page shows it and API returned its id
    await expect.soft(page.getByText(checklistTitle).first(), 'Create: detail page should show the new title').toBeVisible({ timeout: 15000 });
    expect.soft(createRes.ok() && !!checklistMasterId, 'Record should be created successfully on Save').toBeTruthy();
  });

  // -- 2. SEARCH -----------------------------------------
  await step('SEARCH', async () => {
    await checklistMasterPage.findChecklistMaster(checklistTitle);
    await expect.soft(checklistMasterPage.searchTitleInput, 'Search: title filter should hold the searched title').toHaveValue(checklistTitle);
    await assertRow(checklistTitle, 'Search');
    console.log('Search verified — checklist master found in list');

    // Clear-search coverage: X icon may be absent, so never fail the chain here
    try {
      await checklistMasterPage.clearSearch();
      await expect.soft(checklistMasterPage.searchTitleInput, 'Clear (X): title filter should be cleared').toHaveValue('');
      console.log('Clear search verified — filter cleared');
    } catch (err) {
      console.log('Clear search skipped (X icon absent):', (err as Error).message);
    }
  });

  // -- 3. EDIT (list pencil icon) — rename --------------
  await step('EDIT', async () => {
    editName = generateNewChecklistTitle(usedNames);

    await checklistMasterPage.findChecklistMaster(checklistTitle);
    await checklistMasterPage.clickEdit(checklistTitle);
    await expect.soft(checklistMasterPage.title, 'Edit: form should be prefilled with current title').toHaveValue(checklistTitle);
    await checklistMasterPage.title.fill(editName);

    const editResPromise = page.waitForResponse(isChecklistMasterSave, { timeout: 20000 });
    await checklistMasterPage.save();
    expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
    await checklistMasterPage.waitForDetailPage();

    await checklistMasterPage.findChecklistMaster(editName);
    await assertRow(editName, 'Edit');
    console.log(`Edit verified — "${checklistTitle}" renamed to "${editName}"`);
  });

  // -- 4. DUPLICATE (list copy icon) — type copied + new name --
  await step('DUPLICATE', async () => {
    duplicateName = generateNewChecklistTitle(usedNames);

    await checklistMasterPage.findChecklistMaster(editName);
    await checklistMasterPage.clickDuplicate(editName);
    await expect.soft(checklistMasterPage.type.locator('option:checked'), 'Duplicate: checklist type should be copied').not.toHaveText('Select');
    await checklistMasterPage.title.fill(duplicateName);

    const dupResPromise = page.waitForResponse(isChecklistMasterSave, { timeout: 20000 });
    await checklistMasterPage.save();
    expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
    await checklistMasterPage.waitForDetailPage();

    await checklistMasterPage.findChecklistMaster(duplicateName);
    await assertRow(duplicateName, 'Duplicate');
    console.log(`Duplicate verified — "${editName}" duplicated as "${duplicateName}"`);
  });

  // -- 5. VIEW (list eye icon) ? detail page ? Edit button --
  await step('VIEW', async () => {
    viewEditName = generateNewChecklistTitle(usedNames);

    await checklistMasterPage.findChecklistMaster(duplicateName);
    await checklistMasterPage.clickView(duplicateName);

    await expect.soft(page, 'View: should open checklist master detail page').toHaveURL(/#\/home\/checklistmasters\/detail\/\d+/);
    await expect.soft(page.getByText(duplicateName).first(), 'View: checklist title should be shown').toBeVisible({ timeout: 15000 });

    await checklistMasterPage.clickDetailEdit();
    await expect.soft(checklistMasterPage.title, 'Detail Edit: form should be prefilled with current title').toHaveValue(duplicateName);
    await checklistMasterPage.title.fill(viewEditName);

    const viewResPromise = page.waitForResponse(isChecklistMasterSave, { timeout: 20000 });
    await checklistMasterPage.save();
    expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
    await checklistMasterPage.waitForDetailPage();

    await checklistMasterPage.findChecklistMaster(viewEditName);
    await assertRow(viewEditName, 'Detail Edit');
    console.log(`View + Edit verified — "${duplicateName}" renamed to "${viewEditName}"`);
  });

  // -- 6. BULK EDIT — tick first 2 rows ? Select Actions ? Edit Checklist Masters ? Assigned To --
  await step('BULK EDIT', async () => {
    const newAssignee = bulkAssigneeRe;

    await checklistMasterPage.navigateToList();
    await expect.soft(page, 'Bulk Edit: should be on Checklist Masters list page').toHaveURL(/#\/home\/checklistmasters$/);
    // Reset the title filter via the X icon beside Search so the full list returns
    if (await checklistMasterPage.clearSearchBtn.isVisible().catch(() => false)) {
      await checklistMasterPage.clearSearch();
      await expect.soft(checklistMasterPage.searchTitleInput, 'Clear (X): title filter should be cleared').toHaveValue('');
      console.log('Filter cleared via X — full checklist master list restored');
    }
    await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

    const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
    bulkNames.length = 0;
    for (const row of firstTwoRows) {
      const text = ((await row.innerText()).trim().split('\n')[0] || '').trim();
      bulkNames.push(text);

      const checkbox = checklistMasterPage.rowCheckbox(row);
      // The app can reset selection on re-render — tick until it sticks (bounded)
      let ticked = false;
      for (let attempt = 0; attempt < 3 && !ticked; attempt++) {
        await checkbox.check().catch(() => {});
        await page.waitForTimeout(500);
        ticked = await checkbox.isChecked().catch(() => false);
      }
      await expect.soft(checkbox, `Bulk Edit: row "${text}" should be ticked`).toBeChecked();
    }
    console.log('Ticked first 2 checklist masters:', bulkNames.join(' & '));

    // Re-verify right before the bulk action so a late reset cannot make it a silent no-op
    for (const row of firstTwoRows) {
      const cb = checklistMasterPage.rowCheckbox(row);
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.check().catch(() => {});
      }
    }

    await checklistMasterPage.chooseBulkAction(/^Edit Checklist Masters?$/);
    await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/checklistmasters\/add-edit/);
    await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

    bulkAssigneeLabel = await checklistMasterPage.selectOptionByText(checklistMasterPage.assignedTo, newAssignee);
    await expect.soft(checklistMasterPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(bulkAssigneeLabel);

    const bulkResPromise = page.waitForResponse(isChecklistMasterSave, { timeout: 20000 });
    await checklistMasterPage.save();
    expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
    await checklistMasterPage.waitForBulkComplete();
    // List reloads after bulk save — wait for rows before finishing (never end on a spinner)
    await expect.soft(page.locator('tbody tr').first(), 'Bulk Edit: list should reload with rows').toBeVisible({ timeout: 30000 });
    console.log(`Bulk Edit saved — Assigned To: "${bulkAssigneeLabel}"`);
  });


  if (stepFailed.length) {
    console.log(`Chain finished with logged bugs in: ${stepFailed.join(', ')}`);
  } else {
    console.log(`Checklist Master UI chain complete — created "${checklistTitle}", edited to "${editName}", duplicated to "${duplicateName}", detail-edited to "${viewEditName}"`);
  }
});
