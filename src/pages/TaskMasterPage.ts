import { Page, Locator } from '@playwright/test';

export class TaskMasterPage {
  readonly page: Page;

  // List page — Create button
  readonly createTaskMasterBtn: Locator;

  // List page — Search filters
  readonly searchTaskTypeInput: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Create Task Master form
  // API keys (tests/Taskmaster.api.spec.ts): taskmaster_name (Task Type),
  // taskmaster_category, taskmaster_description, taskmaster_priority,
  // taskmaster_dueday, assign_to. Id field: taskmasterid.
  // Ref is AUTO GENERATED — never fill.
  readonly taskType: Locator;
  readonly category: Locator;
  readonly description: Locator;
  readonly priority: Locator;
  readonly dueDays: Locator;
  readonly assignedTo: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createTaskMasterBtn = page.getByRole('button', { name: 'Create Task Master' });
    this.searchTaskTypeInput = page.getByPlaceholder('Task Type');
    this.searchBtn = page.getByRole('button', { name: 'Search' });
    this.selectActions = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Form — Task Type* label carries the required asterisk as a separate
    // node, so the starts-with variant is used here.
    // Ref input is name='taskmaster_num' (per live DOM) so the Task Type input takes the API key name.
    this.taskType = page.locator("input[name='taskmaster_name']").first();
    this.category = page
      .locator("select[name='taskmaster_category'], select[name='category']")
      .first();
    this.description = page
      .locator("textarea[name='taskmaster_description'], textarea[name='description']")
      .first();
    this.priority = page
      .locator("select[name='taskmaster_priority'], select[name='priority']")
      .first();
    this.dueDays = this.fieldByLabelStartsWith('Due Date');
    // assign_to left as default Sonam Burbure (only changed in bulk edit)
    this.assignedTo = page.locator("select[name='assign_to']").first();

    // Buttons
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/taskmasters/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/taskmasters`);
    try {
      await this.createTaskMasterBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createTaskMasterBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickCreate() {
    await this.createTaskMasterBtn.waitFor({ state: 'visible' });
    await this.createTaskMasterBtn.click();
    await this.taskType.waitFor({ state: 'visible' });
  }

  // Input sitting right after a field label (immune to input name attrs).
  private fieldByLabel(label: string): Locator {
    return this.page.locator(`xpath=//*[normalize-space(text())='${label}' and not(.//button)]/following::input[1]`);
  }

  // Starts-with variant for *-marked labels whose asterisk renders as a
  // separate node: 'Task Type' (label text 'Task Type*') and 'Due Date'
  // (label text 'Due Date X days from Event Start Date').
  private fieldByLabelStartsWith(prefix: string): Locator {
    return this.page.locator(`xpath=//*[starts-with(normalize-space(text()),'${prefix}') and not(.//button)]/following::input[1]`);
  }

  // Selects the first <option> whose text matches, e.g. /^Sonam Burbure$/ matches 'Sonam Burbure'
  async selectOptionByText(select: Locator, text: RegExp): Promise<string> {
    const labels = (await select.locator('option').allInnerTexts()).map(t => t.trim());
    const label = labels.find(t => text.test(t));
    if (!label) throw new Error(`No option matching ${text} — available: ${labels.join(', ')}`);
    await select.selectOption({ label });
    return label;
  }

  // Picks a random real option (skips the 'Select' placeholder) and returns its label
  async selectRandomOption(select: Locator): Promise<string> {
    await select.waitFor({ state: 'visible' });
    const labels = (await select.locator('option').allInnerTexts())
      .map(t => t.trim())
      .filter(t => t && t !== 'Select');
    if (!labels.length) throw new Error('No selectable options found');
    const label = labels[Math.floor(Math.random() * labels.length)];
    await select.selectOption({ label });
    return label;
  }

  async fillForm(data: {
    type: string;
    category?: RegExp | string;
    description?: string;
    priority?: RegExp | string;
    dueDays?: string;
  }) {
    await this.taskType.waitFor({ state: 'visible' });
    await this.taskType.fill(data.type);

    if (data.category !== undefined) {
      if (data.category instanceof RegExp) await this.selectOptionByText(this.category, data.category);
      else await this.category.selectOption({ label: data.category });
    } else {
      await this.selectRandomOption(this.category);
    }

    if (data.description !== undefined) await this.description.fill(data.description);

    if (data.priority !== undefined) {
      if (data.priority instanceof RegExp) await this.selectOptionByText(this.priority, data.priority);
      else await this.priority.selectOption({ label: data.priority });
    } else {
      await this.selectRandomOption(this.priority);
    }

    await this.dueDays.fill(data.dueDays ?? '2');
    // assign_to left as default Sonam Burbure (only changed in bulk edit)
    // Ref is AUTO GENERATED — never fill
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  async searchTaskMasters(filters: { type?: string }) {
    if (filters.type) await this.searchTaskTypeInput.fill(filters.type);
    await this.searchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async createTaskMaster(data: Parameters<TaskMasterPage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    await this.save();
  }

  // -- Row actions (list page) -----------------------------
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye)
  // Rows match by unique task name only — NEVER any other column
  rowByName(name: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: name }).first();
  }

  private rowActionIcon(name: string, index: number): Locator {
    return this.rowByName(name).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(name: string) {
    await this.rowActionIcon(name, 0).click();
    await this.taskType.waitFor({ state: 'visible' });
  }

  async clickDuplicate(name: string) {
    await this.rowActionIcon(name, 1).click();
    await this.taskType.waitFor({ state: 'visible' });
  }

  async clickView(name: string) {
    await this.rowActionIcon(name, 2).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the task master detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/taskmasters\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.taskType.waitFor({ state: 'visible' });
  }

  async findTaskMaster(type: string) {
    await this.navigateToList();
    await this.searchTaskMasters({ type });
    await this.rowByName(type).waitFor({ state: 'visible', timeout: 15000 });
  }

  // -- Bulk edit (list page) -------------------------------
  rowCheckbox(row: Locator): Locator {
    return row.locator('td').first().locator('input[type="checkbox"]');
  }

  // Works whether 'Select Actions' is a native <select> or a custom dropdown
  async chooseBulkAction(action: RegExp) {
    const tag = await this.selectActions.evaluate(el => el.tagName.toLowerCase());
    const nativeSelect = tag === 'select' ? this.selectActions
      : tag === 'option' ? this.selectActions.locator('xpath=..') : null;
    if (nativeSelect) {
      const label = await nativeSelect.locator('option').filter({ hasText: action }).first().innerText();
      await nativeSelect.selectOption({ label: label.trim() });
    } else {
      await this.selectActions.click();
      await this.page.getByText(action).first().click();
    }
  }

  async clearSearch() {
    await this.clearSearchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // After bulk save the app shows an "Updating..." progress popup — wait until
  // it appears and then disappears so the run never races ahead of the server.
  async waitForBulkComplete(timeout = 60000) {
    const updating = this.page.getByText(/Updating\.\.\./i).first();
    try {
      await updating.waitFor({ state: 'visible', timeout: 8000 });
      await updating.waitFor({ state: 'hidden', timeout });
      console.log('Bulk progress completed — "Updating..." popup closed');
    } catch {
      console.log('Bulk progress settled (popup absent or already closed)');
    }
  }
}