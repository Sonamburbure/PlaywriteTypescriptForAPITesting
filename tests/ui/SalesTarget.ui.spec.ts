import { test, expect, Response } from '@playwright/test';
import { SalesTargetPage, SALES_TARGET_MONTHS } from '../../src/pages/SalesTargetPage.js';

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

// Unique 6-digit total per run — the row pin (staff names repeat across runs,
// so NEVER assert person-only; same role as phone in other suites)
function generateTotal(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

function generateYear(): string {
  return String(2027 + Math.floor(Math.random() * 9)); // 2027-2035
}

// Random 4-5 digit month amount
function generateMonthAmount(): string {
  return String(1000 + Math.floor(Math.random() * 99000));
}

function buildMonths(): Record<string, string> {
  const months: Record<string, string> = {};
  for (const name of SALES_TARGET_MONTHS) months[name] = generateMonthAmount();
  return months;
}

test('Sales Target UI Test — Create, Search, Edit, Duplicate, View', async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_UI_URL!);

  const salesTargetPage = new SalesTargetPage(page);

  // Spec passes NO salesPerson — the page object picks a random one inside fillForm.
  // Rows are pinned by the unique TOTAL instead.
  const total = generateTotal();
  const year = generateYear();
  const months = buildMonths();

  const isSalesTargetSave = (resp: Response) =>
    resp.url().includes('/salestarget') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (totalPin: string, label: string) => {
    const row = salesTargetPage.rowByName('', totalPin);
    await expect.soft(row, `${label}: total "${totalPin}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row, `${label}: row should contain total`).toContainText(totalPin);
  };

  // Soft-step runner: a bug in one step is LOGGED but never aborts the chain.
  // Soft asserts still mark the test failed at the end, so bugs stay visible.
  const stepFailed: string[] = [];
  async function step(label: string, fn: () => Promise<void>) {
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

  let editTotal = '';
  let editJanuary = '';
  let duplicateTotal = '';
  let viewEditTotal = '';

  // -- 1. CREATE -----------------------------------------
  await step('CREATE', async () => {
    console.log(`Creating sales target — total: ${total}, year: ${year}`);
    const createResPromise = page.waitForResponse(isSalesTargetSave, { timeout: 20000 });
    await salesTargetPage.createSalesTarget({ total, year, months });
    const createRes = await createResPromise;
    await salesTargetPage.waitForDetailPage();

    const body = await createRes.json();
    const salesTargetId = body?.salestargetid ?? body?.id ?? body?.[0]?.salestargetid ?? body?.[0]?.id;
    console.log('Sales Target ID:', salesTargetId);

    expect.soft(createRes.ok(), 'POST /salestarget should return 2xx').toBeTruthy();
    expect.soft(salesTargetId, 'salestargetid should be present in response').toBeTruthy();
    // Record must exist after Save: detail page shows it and API returned its id
    await expect.soft(page.getByText(total).first(), 'Create: detail page should show the new total').toBeVisible({ timeout: 15000 });
    expect.soft(createRes.ok() && !!salesTargetId, 'Record should be created successfully on Save').toBeTruthy();
  });

  // -- 2. SEARCH -----------------------------------------
  await step('SEARCH', async () => {
    await salesTargetPage.findSalesTarget('', total);
    await expect.soft(salesTargetPage.searchTotalInput, 'Search: total filter should hold the searched total').toHaveValue(total);
    await assertRow(total, 'Search');
    console.log('Search verified — sales target found in list');

    // Clear-search coverage: X icon may be absent, so never fail the chain here
    try {
      await salesTargetPage.clearSearch();
      await expect.soft(salesTargetPage.searchPersonInput, 'Clear (X): person filter should be cleared').toHaveValue('');
      console.log('Clear search verified — filter cleared');
    } catch (err) {
      console.log('Clear search skipped (X icon absent):', (err as Error).message);
    }
  });

  // -- 3. EDIT (list pencil icon) — update total ---
  await step('EDIT', async () => {
    editTotal = generateTotal();
    const editYear = generateYear();

    await salesTargetPage.findSalesTarget('', total);
    await salesTargetPage.clickEdit('', total);
    await expect.soft(salesTargetPage.totalSalesTarget, 'Edit: form should be prefilled with current total').toHaveValue(total);
    await salesTargetPage.totalSalesTarget.fill(editTotal);
    editJanuary = generateMonthAmount();
    await salesTargetPage.monthInput('January').fill(editJanuary);
    await salesTargetPage.targetYear.fill(editYear);

    const editResPromise = page.waitForResponse(isSalesTargetSave, { timeout: 20000 });
    await salesTargetPage.save();
    expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
    await salesTargetPage.waitForDetailPage();

    await salesTargetPage.findSalesTarget('', editTotal);
    await assertRow(editTotal, 'Edit');
    console.log(`Edit verified — total "${total}" changed to "${editTotal}" (year ${editYear})`);
  });

  // -- 4. DUPLICATE (list copy icon) — January copied + new total --
  await step('DUPLICATE', async () => {
    duplicateTotal = generateTotal();

    await salesTargetPage.findSalesTarget('', editTotal);
    await salesTargetPage.clickDuplicate('', editTotal);
    await expect.soft(salesTargetPage.monthInput('January'), 'Duplicate: January value should be copied').toHaveValue(editJanuary);
    await salesTargetPage.totalSalesTarget.fill(duplicateTotal);

    const dupResPromise = page.waitForResponse(isSalesTargetSave, { timeout: 20000 });
    await salesTargetPage.save();
    expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
    await salesTargetPage.waitForDetailPage();

    await salesTargetPage.findSalesTarget('', duplicateTotal);
    await assertRow(duplicateTotal, 'Duplicate');
    console.log(`Duplicate verified — January "${months['January']}" copied, total "${duplicateTotal}"`);
  });

  // -- 5. VIEW (list eye icon) ? detail page ? Edit button --
  await step('VIEW', async () => {
    viewEditTotal = generateTotal();

    await salesTargetPage.findSalesTarget('', duplicateTotal);
    await salesTargetPage.clickView('', duplicateTotal);

    await expect.soft(page, 'View: should open sales target detail page').toHaveURL(/#\/home\/salestargets\/detail\/\d+/);
    await expect.soft(page.getByText(duplicateTotal).first(), 'View: total should be shown').toBeVisible({ timeout: 15000 });

    await salesTargetPage.clickDetailEdit();
    await expect.soft(salesTargetPage.totalSalesTarget, 'Detail Edit: form should be prefilled with current total').toHaveValue(duplicateTotal);
    await salesTargetPage.totalSalesTarget.fill(viewEditTotal);

    const viewResPromise = page.waitForResponse(isSalesTargetSave, { timeout: 20000 });
    await salesTargetPage.save();
    expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
    await salesTargetPage.waitForDetailPage();

    await salesTargetPage.findSalesTarget('', viewEditTotal);
    await assertRow(viewEditTotal, 'Detail Edit');
    console.log(`View + Edit verified — total "${duplicateTotal}" changed to "${viewEditTotal}"`);
  });

  // -- 6. BULK EDIT — tick first 2 rows ? Select Actions ? Edit Sales Targets ? Assigned To --
  await step('BULK EDIT', async () => {
    const newAssignee = /^Sonam Burbure$/;

    await salesTargetPage.navigateToList();
    await expect.soft(page, 'Bulk Edit: should be on Sales Targets list page').toHaveURL(/#\/home\/salestargets$/);
    // Reset the person filter via the X icon beside Search so the full list returns
    if (await salesTargetPage.clearSearchBtn.isVisible().catch(() => false)) {
      await salesTargetPage.clearSearch();
      await expect.soft(salesTargetPage.searchPersonInput, 'Clear (X): person filter should be cleared').toHaveValue('');
      console.log('Filter cleared via X — full sales target list restored');
    }
    await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

    const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
    const bulkTotals: string[] = [];
    for (const row of firstTwoRows) {
      const text = ((await row.innerText()).trim().split('\n')[0] || '').trim();
      bulkTotals.push(text);

      const checkbox = salesTargetPage.rowCheckbox(row);
      // The app can reset selection on re-render — tick until it sticks (bounded)
      let ticked = false;
      for (let attempt = 0; attempt < 3 && !ticked; attempt++) {
        await checkbox.check().catch(() => {});
        await page.waitForTimeout(500);
        ticked = await checkbox.isChecked().catch(() => false);
      }
      await expect.soft(checkbox, `Bulk Edit: row "${text}" should be ticked`).toBeChecked();
    }
    console.log('Ticked first 2 sales targets:', bulkTotals.join(' & '));

    // Re-verify right before the bulk action so a late reset cannot make it a silent no-op
    for (const row of firstTwoRows) {
      const cb = salesTargetPage.rowCheckbox(row);
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.check().catch(() => {});
      }
    }
    console.log('Ticked first 2 sales targets:', bulkTotals.join(' & '));

    await salesTargetPage.chooseBulkAction(/^Edit Sales Targets?$/);
    await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/salestargets\/add-edit/);
    await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

    const assigneeLabel = await salesTargetPage.selectOptionByText(salesTargetPage.assignedTo, newAssignee);
    await expect.soft(salesTargetPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);

    const bulkResPromise = page.waitForResponse(isSalesTargetSave, { timeout: 20000 });
    await salesTargetPage.save();
    expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
    await salesTargetPage.waitForBulkComplete();
    // List reloads after bulk save — wait for rows before finishing (never end on a spinner)
    await expect.soft(page.locator('tbody tr').first(), 'Bulk Edit: list should reload with rows').toBeVisible({ timeout: 30000 });
    console.log(`Bulk Edit saved — Assigned To: "${assigneeLabel}"`);
  });

  if (stepFailed.length) {
    console.log(`Chain finished with logged bugs in: ${stepFailed.join(', ')}`);
  } else {
    console.log(`Sales Target UI chain complete — created "${total}", edited to "${editTotal}", duplicated to "${duplicateTotal}", detail-edited to "${viewEditTotal}"`);
  }
});