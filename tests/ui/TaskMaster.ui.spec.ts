import { test, expect, Response } from '@playwright/test';
import { TaskMasterPage } from '../../src/pages/TaskMasterPage.js';

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

// Logical task names only, NO digits, NO Date.now suffix: `${prefix} ${task}`
// Same pools as tests/Taskmaster.api.spec.ts — in-run uniqueness via used-set + regenerate
const TASK_PREFIXES = ['Pre-Event', 'On-Site', 'Post-Event', 'Day-Of', 'Setup', 'Closedown', 'Briefing', 'Inspection', 'Coordination', 'Review'];
const TASK_NAMES = ['Venue Setup', 'Catering Coordination', 'Staff Briefing', 'Equipment Deployment', 'Guest Management', 'Bar Operations', 'Safety Compliance', 'Transport Logistics', 'Decor Arrangement', 'Event Closedown', 'AV Check', 'Supplier Liaison', 'Parking Management', 'VIP Handling', 'Waste Disposal'];

const TASK_DESCRIPTIONS = [
  'Coordinate with venue staff to confirm space allocation, layout and setup requirements before event begins',
  'Verify catering quantities, dietary requirements and confirm service timing with the catering team',
  'Brief all event staff on their assigned roles, responsibilities and emergency procedures',
  'Deploy and test all equipment on site and confirm operational readiness before doors open',
];

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNewTaskMasterName(used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const name = `${getRand(TASK_PREFIXES)} ${getRand(TASK_NAMES)}`;
    if (!used.has(name) && !/\d/.test(name)) {
      used.add(name);
      return name;
    }
  }
  // Deterministic sweep — still no digits, no Date.now
  for (const prefix of TASK_PREFIXES) {
    for (const task of TASK_NAMES) {
      const name = `${prefix} ${task}`;
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
  }
  throw new Error('Exhausted task name pool — all prefix/task combinations used');
}

test('Task Master UI Test — Create, Search, Edit, Duplicate, View', async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_UI_URL!);

  const taskMasterPage = new TaskMasterPage(page);
  const usedNames = new Set<string>();

  const taskName = generateNewTaskMasterName(usedNames);
  const taskDescription = getRand(TASK_DESCRIPTIONS);
  const DUE_DAYS = '2';

  const isTaskMasterSave = (resp: Response) =>
    (resp.url().includes('/taskmaster') || resp.url().includes('/task-master')) &&
    ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (name: string, label: string) => {
    const row = taskMasterPage.rowByName(name);
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

  // -- 1. CREATE -----------------------------------------
  await step('CREATE', async () => {
    console.log(`Creating task master — type: ${taskName}`);
    await taskMasterPage.navigateToList();
    await taskMasterPage.clickCreate();

    await taskMasterPage.taskType.fill(taskName);
    try {
      const categoryLabel = await taskMasterPage.selectRandomOption(taskMasterPage.category);
      console.log(`Category (random): ${categoryLabel}`);
    } catch (err) {
      console.log('Category skipped:', (err as Error).message.split('\n')[0]);
    }
    await taskMasterPage.description.fill(taskDescription);
    try {
      const priorityLabel = await taskMasterPage.selectRandomOption(taskMasterPage.priority);
      console.log(`Priority (random): ${priorityLabel}`);
    } catch (err) {
      console.log('Priority skipped:', (err as Error).message.split('\n')[0]);
    }
    await taskMasterPage.dueDays.fill(DUE_DAYS);
    // assign_to left as default Sonam Burbure. Ref is AUTO GENERATED — never fill.

    const createResPromise = page.waitForResponse(isTaskMasterSave, { timeout: 20000 });
    await taskMasterPage.save();
    const createRes = await createResPromise;
    await taskMasterPage.waitForDetailPage();

    const body = await createRes.json().catch(() => ({}));
    const taskMasterId = body?.taskmasterid ?? body?.id ?? body?.[0]?.taskmasterid ?? body?.[0]?.id;
    console.log('Task Master ID:', taskMasterId);

    expect.soft(createRes.ok(), 'POST /taskmaster should return 2xx').toBeTruthy();
    expect.soft(taskMasterId, 'taskmasterid should be present in response').toBeTruthy();
    // Record must exist after Save: detail page shows it and API returned its id
    await expect.soft(page.getByText(taskName).first(), 'Create: detail page should show the new name').toBeVisible({ timeout: 15000 });
    expect.soft(createRes.ok() && !!taskMasterId, 'Record should be created successfully on Save').toBeTruthy();
  });

  // -- 2. SEARCH -----------------------------------------
  await step('SEARCH', async () => {
    await taskMasterPage.findTaskMaster(taskName);
    await expect.soft(taskMasterPage.searchTaskTypeInput, 'Search: type filter should hold the searched type').toHaveValue(taskName);
    await assertRow(taskName, 'Search');
    console.log('Search verified — task master found in list');

    // Clear-search coverage: X icon may be absent, so never fail the chain here
    try {
      await taskMasterPage.clearSearch();
      await expect.soft(taskMasterPage.searchTaskTypeInput, 'Clear (X): type filter should be cleared').toHaveValue('');
      console.log('Clear search verified — filter cleared');
    } catch (err) {
      console.log('Clear search skipped (X icon absent):', (err as Error).message);
    }
  });

  // -- 3. EDIT (list pencil icon) — rename --------------
  await step('EDIT', async () => {
    editName = generateNewTaskMasterName(usedNames);

    await taskMasterPage.findTaskMaster(taskName);
    await taskMasterPage.clickEdit(taskName);
    await expect.soft(taskMasterPage.taskType, 'Edit: form should be prefilled with current type').toHaveValue(taskName);
    await taskMasterPage.taskType.fill(editName);

    const editResPromise = page.waitForResponse(isTaskMasterSave, { timeout: 20000 });
    await taskMasterPage.save();
    expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
    await taskMasterPage.waitForDetailPage();

    await taskMasterPage.findTaskMaster(editName);
    await assertRow(editName, 'Edit');
    console.log(`Edit verified — "${taskName}" renamed to "${editName}"`);
  });

  // -- 4. DUPLICATE (list copy icon) — description copied + new name --
  await step('DUPLICATE', async () => {
    duplicateName = generateNewTaskMasterName(usedNames);

    await taskMasterPage.findTaskMaster(editName);
    await taskMasterPage.clickDuplicate(editName);
    await expect.soft(taskMasterPage.description, 'Duplicate: description should be copied').toHaveValue(taskDescription);
    await taskMasterPage.taskType.fill(duplicateName);

    const dupResPromise = page.waitForResponse(isTaskMasterSave, { timeout: 20000 });
    await taskMasterPage.save();
    expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
    await taskMasterPage.waitForDetailPage();

    await taskMasterPage.findTaskMaster(duplicateName);
    await assertRow(duplicateName, 'Duplicate');
    console.log(`Duplicate verified — "${editName}" duplicated as "${duplicateName}"`);
  });

  // -- 5. VIEW (list eye icon) → detail page → Edit button --
  await step('VIEW', async () => {
    viewEditName = generateNewTaskMasterName(usedNames);

    await taskMasterPage.findTaskMaster(duplicateName);
    await taskMasterPage.clickView(duplicateName);

    await expect.soft(page, 'View: should open task master detail page').toHaveURL(/#\/home\/taskmasters\/detail\/\d+/);
    await expect.soft(page.getByText(duplicateName).first(), 'View: task name should be shown').toBeVisible({ timeout: 15000 });

    await taskMasterPage.clickDetailEdit();
    await expect.soft(taskMasterPage.taskType, 'Detail Edit: form should be prefilled with current type').toHaveValue(duplicateName);
    await taskMasterPage.taskType.fill(viewEditName);

    const viewResPromise = page.waitForResponse(isTaskMasterSave, { timeout: 20000 });
    await taskMasterPage.save();
    expect.soft((await viewResPromise).ok(), 'Detail Edit save should return 2xx').toBeTruthy();
    await taskMasterPage.waitForDetailPage();

    await taskMasterPage.findTaskMaster(viewEditName);
    await assertRow(viewEditName, 'Detail Edit');
    console.log(`View + Edit verified — "${duplicateName}" renamed to "${viewEditName}"`);
  });

  // -- 6. BULK EDIT — tick first 2 rows → Select Actions → Edit Task Masters → Assigned To --
  await step('BULK EDIT', async () => {
    const newAssignee = /^Sonam Burbure$/;

    await taskMasterPage.navigateToList();
    await expect.soft(page, 'Bulk Edit: should be on Task Masters list page').toHaveURL(/#\/home\/taskmasters$/);
    // Reset the type filter via the X icon beside Search so the full list returns
    if (await taskMasterPage.clearSearchBtn.isVisible().catch(() => false)) {
      await taskMasterPage.clearSearch();
      await expect.soft(taskMasterPage.searchTaskTypeInput, 'Clear (X): type filter should be cleared').toHaveValue('');
      console.log('Filter cleared via X — full task master list restored');
    }
    await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

    const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
    const bulkNames: string[] = [];
    for (const row of firstTwoRows) {
      const text = ((await row.innerText()).trim().split('\n')[0] || '').trim();
      bulkNames.push(text);

      const checkbox = taskMasterPage.rowCheckbox(row);
      // The app can reset selection on re-render — tick until it sticks (bounded)
      let ticked = false;
      for (let attempt = 0; attempt < 3 && !ticked; attempt++) {
        await checkbox.check().catch(() => {});
        await page.waitForTimeout(500);
        ticked = await checkbox.isChecked().catch(() => false);
      }
      await expect.soft(checkbox, `Bulk Edit: row "${text}" should be ticked`).toBeChecked();
    }
    console.log('Ticked first 2 task masters:', bulkNames.join(' & '));

    // Re-verify right before the bulk action so a late reset cannot make it a silent no-op
    for (const row of firstTwoRows) {
      const cb = taskMasterPage.rowCheckbox(row);
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.check().catch(() => {});
      }
    }

    await taskMasterPage.chooseBulkAction(/^Edit Task Masters?$/);
    await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/taskmasters\/add-edit/);
    await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

    const assigneeLabel = await taskMasterPage.selectOptionByText(taskMasterPage.assignedTo, newAssignee);
    await expect.soft(taskMasterPage.assignedTo.locator('option:checked'), 'Bulk Edit: Assigned To should be selected').toHaveText(assigneeLabel);

    const bulkResPromise = page.waitForResponse(isTaskMasterSave, { timeout: 20000 });
    await taskMasterPage.save();
    expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
    await taskMasterPage.waitForBulkComplete();
    // List reloads after bulk save — wait for rows before finishing (never end on a spinner)
    await expect.soft(page.locator('tbody tr').first(), 'Bulk Edit: list should reload with rows').toBeVisible({ timeout: 30000 });
    console.log(`Bulk Edit saved — Assigned To: "${assigneeLabel}"`);
  });

  if (stepFailed.length) {
    console.log(`Chain finished with logged bugs in: ${stepFailed.join(', ')}`);
  } else {
    console.log(`Task Master UI chain complete — created "${taskName}", edited to "${editName}", duplicated to "${duplicateName}", detail-edited to "${viewEditName}"`);
  }
});