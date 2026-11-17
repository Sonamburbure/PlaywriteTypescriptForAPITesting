import { Page, Locator } from '@playwright/test';

export class ChecklistMasterPage {
  readonly page: Page;

  // List page � Create button
  readonly createChecklistMasterBtn: Locator;

  // List page � Search filters
  readonly searchTitleInput: Locator;
  readonly searchBtn: Locator;

  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Create form � API keys: checklistmaster_name (Title*), checklistmaster_type
  // (Type*), assign_to. Ref is AUTO GENERATED � never fill.
  readonly title: Locator;
  readonly type: Locator;
  readonly assignedTo: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createChecklistMasterBtn = page.getByRole('button', { name: 'Create Checklist Master' });
    this.searchTitleInput = page.getByPlaceholder('Checklist Master Title');
    this.searchBtn = page.getByRole('button', { name: 'Search' });

    this.selectActions = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Title* label carries the required asterisk as a separate node
    this.title = this.fieldByLabelStartsWith('Checklist Master Title');
    // Type dropdown � `name` attr unconfirmed; UNION + .first() for resilience
    this.type = page.locator("select[name='checklistmaster_type'], select[name='checklist_type'], select[name='type']").first();
    // assign_to left as default Sonam Burbure (only changed in bulk edit)
    this.assignedTo = page.locator("select[name='assign_to']").first();

    // Buttons
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // Input sitting right after a field label � starts-with variant for *-marked
  // labels whose asterisk renders as a separate node.
  private fieldByLabelStartsWith(prefix: string): Locator {
    return this.page.locator(`xpath=//*[starts-with(normalize-space(text()),'${prefix}') and not(.//button)]/following::input[1]`);
  }

  // A hash-only goto can leave the SPA on the old view, so confirm the list
  // rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/checklistmasters`);
    try {
      await this.createChecklistMasterBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createChecklistMasterBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickCreate() {
    await this.createChecklistMasterBtn.waitFor({ state: 'visible' });
    await this.createChecklistMasterBtn.click();
    await this.title.waitFor({ state: 'visible' });
  }

  // Selects the first <option> whose text matches, e.g. /^Sonam Burbure$/ matches 'Sonam Burbure'
  async selectOptionByText(select: Locator, text: RegExp): Promise<string> {
    const labels = (await select.locator('option').allInnerTexts()).map(t => t.trim());
    const label = labels.find(t => text.test(t));
    if (!label) throw new Error(`No option matching ${text} � available: ${labels.join(', ')}`);
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

  async fillForm(data: { title: string; type?: RegExp | string }) {
    await this.title.waitFor({ state: 'visible' });
    await this.title.fill(data.title);

    if (data.type !== undefined) {
      if (data.type instanceof RegExp) await this.selectOptionByText(this.type, data.type);
      else await this.type.selectOption({ label: data.type });
    } else {
      await this.selectRandomOption(this.type);
    }
    // assign_to left as default Sonam Burbure (only changed in bulk edit)
    // Ref is AUTO GENERATED � never fill
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  async searchChecklistMasters(filters: { title?: string }) {
    if (filters.title) await this.searchTitleInput.fill(filters.title);
    await this.searchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async createChecklistMaster(data: Parameters<ChecklistMasterPage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    await this.save();
  }

  // -- Row actions (list page) -----------------------------
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye)
  // Rows match by unique title only � NEVER any other column
  rowByName(title: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: title }).first();
  }

  private rowActionIcon(title: string, index: number): Locator {
    return this.rowByName(title).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(title: string) {
    await this.rowActionIcon(title, 0).click();
    await this.title.waitFor({ state: 'visible' });
  }

  async clickDuplicate(title: string) {
    await this.rowActionIcon(title, 1).click();
    await this.title.waitFor({ state: 'visible' });
  }

  async clickView(title: string) {
    await this.rowActionIcon(title, 2).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/checklistmasters\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.title.waitFor({ state: 'visible' });
  }

  async findChecklistMaster(title: string) {
    await this.navigateToList();
    await this.searchChecklistMasters({ title });
    await this.rowByName(title).waitFor({ state: 'visible', timeout: 15000 });
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

  // After bulk save the app shows an "Updating..." progress popup � wait until
  // it appears and then disappears so the run never races ahead of the server.
  async waitForBulkComplete(timeout = 60000) {
    const updating = this.page.getByText(/Updating\.\.\./i).first();
    try {
      await updating.waitFor({ state: 'visible', timeout: 8000 });
      await updating.waitFor({ state: 'hidden', timeout });
      console.log('Bulk progress completed � "Updating..." popup closed');
    } catch {
      console.log('Bulk progress settled (popup absent or already closed)');
    }
  }
}
