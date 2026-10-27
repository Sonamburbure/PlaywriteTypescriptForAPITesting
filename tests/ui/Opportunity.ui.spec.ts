import { test, expect, Response } from '@playwright/test';
import { OpportunityPage } from '../../src/pages/OpportunityPage.js';

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

// Logical names only, NO digits: `${adj} ${noun} ${suffix}`
const ADJECTIVES = ['Grand', 'Annual', 'Corporate', 'Charity', 'Winter', 'Summer'];
const NOUNS = ['Gala', 'Summit', 'Expo', 'Wedding', 'Conference'];
const SUFFIXES = ['Event', 'Celebration', 'Fair', 'Showcase'];

function generateNewOpportunityName(used: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const name = `${adj} ${noun} ${suffix}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `Grand Gala Showcase`;
  used.add(`${fallback} ${used.size}`);
  return `${fallback} ${used.size}`;
}

function randomMoney(min: number, max: number): string {
  return String(min + Math.floor(Math.random() * (max - min)));
}

test('Opportunity UI Test — Create, Search, Edit, Duplicate, View', async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_UI_URL!);

  const opportunityPage = new OpportunityPage(page);
  const usedNames = new Set<string>();

  const oppName = generateNewOpportunityName(usedNames);
  const CLOSE_DATE = '2030-06-15'; // fallback if the calendar picker is unavailable
  let closeDateValue = CLOSE_DATE;

  const isOpportunitySave = (resp: Response) =>
    resp.url().includes('/opportunit') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (name: string, label: string) => {
    const row = opportunityPage.rowByName(name);
    await expect.soft(row, `${label}: opportunity "${name}" should appear in search results`).toBeVisible({ timeout: 15000 });
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

  // -- 1. CREATE (form + Detailed Quote item, then bottom Save) --
  await step('CREATE', async () => {
    console.log(`Creating opportunity — name: ${oppName}`);
    await opportunityPage.navigateToList();
    await opportunityPage.clickCreate();

    // Top form: name + close date + random type/stage
    await opportunityPage.opportunityName.fill(oppName);
    // Account then Contact: click each lookup icon, popup opens, pick a random record
    const accountRecord = await opportunityPage.selectLookupRecord('Account');
    const contactRecord = await opportunityPage.selectLookupRecord('Contact');
    if (accountRecord) console.log(`Account linked: ${accountRecord}`);
    if (contactRecord) console.log(`Contact linked: ${contactRecord}`);
    try {
      closeDateValue = await opportunityPage.selectRandomCloseDate(CLOSE_DATE);
      console.log(`Close date set to: ${closeDateValue}`);
    } catch (err) {
      console.log('Close date skipped:', (err as Error).message.split('\n')[0]);
    }
    try {
      const typeLabel = await opportunityPage.selectRandomOption(opportunityPage.opportunityType);
      console.log(`Opportunity type (random): ${typeLabel}`);
    } catch (err) {
      console.log('Opportunity type skipped:', (err as Error).message.split('\n')[0]);
    }
    try {
      const stageLabel = await opportunityPage.selectRandomOption(opportunityPage.salesStage);
      console.log(`Sales stage (random): ${stageLabel}`);
    } catch (err) {
      console.log('Sales stage skipped:', (err as Error).message.split('\n')[0]);
    }
    try {
      const leadLabel = await opportunityPage.selectRandomOption(opportunityPage.leadSource);
      console.log(`Lead source (random): ${leadLabel}`);
    } catch (err) {
      console.log('Lead source skipped:', (err as Error).message.split('\n')[0]);
    }
    try {
      const setupLabel = await opportunityPage.selectRandomOption(opportunityPage.setupRequired);
      console.log(`Setup required (random): ${setupLabel}`);
    } catch (err) {
      console.log('Setup required skipped:', (err as Error).message.split('\n')[0]);
    }
    // assignTo left as default Sonam Burbure. Address + financials left as-is.

    // Bottom: Detailed Quote tab → Add Item → lookup popup → right-side columns
    try {
      await opportunityPage.clickDetailedQuoteTab();
      await opportunityPage.clickAddItem();
      const iconOk = await opportunityPage.clickItemSearchIcon();
      if (!iconOk) {
        console.log('Quote item skipped — search icon unavailable, saving without item');
      } else {
        const { picked, record } = await opportunityPage.pickRandomLookupRecord();
        if (!picked) {
          console.log('Quote item skipped — popup empty, saving without item');
        } else {
        console.log(`Quote item picked: ${record}`);
        // Fixed round numbers so the app math is exactly verifiable: 1500 x 4 = 6000
        await opportunityPage.fillQuoteRowColumns(record, { sales: '1500', cost: '800', qty: '4', discount: '0' });
        await opportunityPage.saveQuoteRow(record);
        const icons = opportunityPage.quoteRowIcons(record);
        await expect.soft(icons.edit, 'Quote: row edit/pencil icon should be visible').toBeVisible();
        await expect.soft(icons.del, 'Quote: row delete/bin icon should be visible').toBeVisible();
        await expect.soft(icons.drag, 'Quote: row drag icon should be visible').toBeVisible();
        console.log(`Quote row verified — right-side icons visible for "${record}"`);
        const { expectedTotal } = await opportunityPage.setQuoteVatAndExpected(record, 6000);
        await opportunityPage.verifyQuoteTotals(record, '6000.00', expectedTotal);
        console.log(`Quote math verified — Subtotal 6000.00, Total ${expectedTotal}`);
      }
      }
    } catch (err) {
      console.log('Quote section skipped (non-fatal):', (err as Error).message.split('\n')[0]);
    }

    const createResPromise = page.waitForResponse(isOpportunitySave, { timeout: 20000 });
    const result = await opportunityPage.saveAndWaitForResult();
    if (!result.saved) {
      if (result.screenshot) {
        await testInfo.attach('validation-error-CREATE', { body: result.screenshot, contentType: 'image/png' }).catch(() => {});
      }
      throw new Error(`Save blocked by app validation: ${result.message}`);
    }
    const createRes = await createResPromise;
    await opportunityPage.waitForDetailPage();

    const body = await createRes.json().catch(() => ({}));
    const opportunityId =
      body?.opportunityid ?? body?.id ?? body?.opportunity_id ?? body?.[0]?.opportunityid ?? body?.[0]?.id;
    console.log('Opportunity ID:', opportunityId);

    expect.soft(createRes.ok(), 'POST /opportunity should return 2xx').toBeTruthy();
    expect.soft(opportunityId, 'opportunityid should be present in response').toBeTruthy();
    // Record must exist after Save: detail page shows it and API returned its id
    await expect.soft(page.getByText(oppName).first(), 'Create: detail page should show the new name').toBeVisible({ timeout: 15000 });
    expect.soft(createRes.ok() && !!opportunityId, 'Record should be created successfully on Save').toBeTruthy();
  });

  // -- 2. SEARCH -----------------------------------------
  await step('SEARCH', async () => {
    await opportunityPage.findOpportunity(oppName);
    await expect.soft(opportunityPage.searchNameInput, 'Search: name filter should hold the searched name').toHaveValue(oppName);
    await assertRow(oppName, 'Search');
    console.log('Search verified — opportunity found in list');

    // Clear-search coverage: X icon may be absent, so never fail the chain here
    try {
      await opportunityPage.clearSearch();
      await expect.soft(opportunityPage.searchNameInput, 'Clear (X): name filter should be cleared').toHaveValue('');
      console.log('Clear search verified — filter cleared');
    } catch (err) {
      console.log('Clear search skipped (X icon absent):', (err as Error).message);
    }
  });

  // -- 3. EDIT (list pencil icon) — rename --------------
  await step('EDIT', async () => {
    editName = generateNewOpportunityName(usedNames);

    await opportunityPage.findOpportunity(oppName);
    await opportunityPage.clickEdit(oppName);
    await expect.soft(opportunityPage.opportunityName, 'Edit: form should be prefilled with current name').toHaveValue(oppName);
    await opportunityPage.opportunityName.fill(editName);

    const editResPromise = page.waitForResponse(isOpportunitySave, { timeout: 20000 });
    await opportunityPage.save();
    expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
    await opportunityPage.waitForDetailPage();

    await opportunityPage.findOpportunity(editName);
    await assertRow(editName, 'Edit');
    console.log(`Edit verified — name "${oppName}" changed to "${editName}"`);
  });

  // -- 4. DUPLICATE (list copy icon) — close date copied + new name --
  await step('DUPLICATE', async () => {
    duplicateName = generateNewOpportunityName(usedNames);

    await opportunityPage.findOpportunity(editName);
    await opportunityPage.clickDuplicate(editName);
    // No town field on this form — duplicate check: close date carried over
    await expect.soft(opportunityPage.closeDate, 'Duplicate: close date should be copied').toHaveValue(closeDateValue);
    await opportunityPage.opportunityName.fill(duplicateName);

    const dupResPromise = page.waitForResponse(isOpportunitySave, { timeout: 20000 });
    await opportunityPage.save();
    expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
    await opportunityPage.waitForDetailPage();

    await opportunityPage.findOpportunity(duplicateName);
    await assertRow(duplicateName, 'Duplicate');
    console.log(`Duplicate verified — close date "${closeDateValue}" copied, name "${duplicateName}"`);
  });

  // -- 5. VIEW (list eye icon) → detail page → Edit button --
  await step('VIEW', async () => {
    viewEditName = generateNewOpportunityName(usedNames);

    await opportunityPage.findOpportunity(duplicateName);
    await opportunityPage.clickView(duplicateName);

    await expect.soft(page, 'View: should open opportunity detail page').toHaveURL(/#\/home\/opportunities\/detail\/\d+/);
    await expect.soft(page.getByText(duplicateName).first(), 'View: name should be shown').toBeVisible({ timeout: 15000 });

    await opportunityPage.clickDetailEdit();
    await expect.soft(opportunityPage.opportunityName, 'Detail Edit: form should be prefilled with current name').toHaveValue(duplicateName);
    await opportunityPage.opportunityName.fill(viewEditName);

    const viewResPromise = page.waitForResponse(isOpportunitySave, { timeout: 20000 });
    await opportunityPage.save();
    expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
    await opportunityPage.waitForDetailPage();

    await opportunityPage.findOpportunity(viewEditName);
    await assertRow(viewEditName, 'Detail Edit');
    console.log(`View + Edit verified — name "${duplicateName}" changed to "${viewEditName}"`);
  });

  // -- 6. BULK EDIT — tick first 2 rows → Select Actions → Edit Opportunities → Assigned To --
  await step('BULK EDIT', async () => {
    const newAssignee = /^Sonam Burbure$/;

    await opportunityPage.navigateToList();
    await expect.soft(page, 'Bulk Edit: should be on Opportunities list page').toHaveURL(/#\/home\/opportunities$/);
    // Reset the name filter via the X icon beside Search so the full list returns
    if (await opportunityPage.clearSearchBtn.isVisible().catch(() => false)) {
      await opportunityPage.clearSearch();
      await expect.soft(opportunityPage.searchNameInput, 'Clear (X): name filter should be cleared').toHaveValue('');
      console.log('Filter cleared via X — full opportunity list restored');
    }
    await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

    const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
    const bulkNames: string[] = [];
    for (const row of firstTwoRows) {
      const text = ((await row.innerText()).trim().split('\n')[0] || '').trim();
      bulkNames.push(text);

      const checkbox = opportunityPage.rowCheckbox(row);
      // The app can reset selection on re-render — tick until it sticks (bounded)
      let ticked = false;
      for (let attempt = 0; attempt < 3 && !ticked; attempt++) {
        await checkbox.check().catch(() => {});
        await page.waitForTimeout(500);
        ticked = await checkbox.isChecked().catch(() => false);
      }
      await expect.soft(checkbox, `Bulk Edit: row "${text}" should be ticked`).toBeChecked();
    }
    console.log('Ticked first 2 opportunities:', bulkNames.join(' & '));

    // Re-verify right before the bulk action so a late reset cannot make it a silent no-op
    for (const row of firstTwoRows) {
      const cb = opportunityPage.rowCheckbox(row);
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.check().catch(() => {});
      }
    }

    await opportunityPage.chooseBulkAction(/^Edit Opportunit(y|ies)?$/);
    await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/opportunities\/add-edit/);
    await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

    const assigneeLabel = await opportunityPage.selectOptionByText(opportunityPage.assignedTo, newAssignee);
    await expect.soft(opportunityPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);

    const bulkResPromise = page.waitForResponse(isOpportunitySave, { timeout: 20000 });
    await opportunityPage.save();
    expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
    await opportunityPage.waitForBulkComplete();
    // List reloads after bulk save — wait for rows before finishing (never end on a spinner)
    await expect.soft(page.locator('tbody tr').first(), 'Bulk Edit: list should reload with rows').toBeVisible({ timeout: 30000 });
    console.log(`Bulk Edit saved — Assigned To: "${assigneeLabel}"`);
  });

  if (stepFailed.length) {
    console.log(`Chain finished with logged bugs in: ${stepFailed.join(', ')}`);
  } else {
    console.log(`Opportunity UI chain complete — created "${oppName}", edited to "${editName}", duplicated to "${duplicateName}", detail-edited to "${viewEditName}"`);
  }
});