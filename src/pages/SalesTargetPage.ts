import { Page, Locator } from '@playwright/test';

export const SALES_TARGET_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export class SalesTargetPage {
  readonly page: Page;

  // List page — Create button
  readonly createSalesTargetBtn: Locator;

  // List page — Search filters
  readonly searchPersonInput: Locator;
  readonly searchTotalInput: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Create form — selects (name attrs unconfirmed except assign_to)
  readonly salesPerson: Locator;
  readonly reportTo: Locator;
  readonly assignedTo: Locator;

  // Create form — label-anchored inputs (name attrs UNCONFIRMED)
  readonly totalSalesTarget: Locator;
  readonly targetYear: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createSalesTargetBtn = page.getByRole('button', { name: 'Create Sales Target' });
    this.searchPersonInput = page.getByPlaceholder('Sales Person');
    this.searchTotalInput = page.getByPlaceholder('Total Sales target');
    this.searchBtn = page.getByRole('button', { name: 'Search' });
    this.selectActions = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Sales Person — UNION over candidate name attrs (unconfirmed), .first() for resilience
    this.salesPerson = page.locator("select[name='sales_person'], select[name='salesperson']").first();
    // Report To / Manager — name attr unconfirmed, UNION over candidates
    this.reportTo = page.locator("select[name='report_to'], select[name='manager'], select[name='reportto']").first();
    // Assigned To — confirmed-ish (API key assign_to), default stays Sonam Burbure (only used in bulk)
    this.assignedTo = page.locator("select[name='assign_to']").first();

    // Total/Year use snapshot+API-confirmed names; months stay label-anchored (guarded).
    // because their input `name` attrs are unconfirmed.
    this.totalSalesTarget = page.locator("input[name='sales_target']").first();
    this.targetYear = page.locator("input[name='sales_target_year']").first();

    // Buttons
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // Input sitting right after a field label. not(.//button) excludes the list-page
  // column headers (they hold sort buttons); the form labels hold none. The required
  // asterisk renders as a separate node, so exact match works on the form.
  private fieldByLabel(label: string): Locator {
    return this.page.locator(`xpath=//*[normalize-space(text())='${label}' and not(.//button)]/following::input[1]`);
  }

  // Month input by visible month label ('January' .. 'December')
  monthInput(monthName: string): Locator {
    const index = SALES_TARGET_MONTHS.indexOf(monthName) + 1; // January = month1 (snapshot-confirmed)
    return this.page.locator(`input[name='month${index}']`).first();
  }

  // A hash-only goto (e.g. from #/home/salestargets/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/salestargets`);
    try {
      await this.createSalesTargetBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createSalesTargetBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickCreate() {
    await this.createSalesTargetBtn.waitFor({ state: 'visible' });
    await this.createSalesTargetBtn.click();
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

  // Picks a random LOGICAL person name: skips placeholders, digits and obvious
  // test junk ('1111', '1user', 'abc', 'test ...', 'App Test', ...). Falls back
  // to any non-Select option when nothing logical exists.
  async selectRandomLogicalPerson(select: Locator): Promise<string> {
    await select.waitFor({ state: 'visible' });
    const labels = (await select.locator('option').allInnerTexts()).map(t => t.trim());
    const logical = labels.filter(
      t => t && t !== 'Select' && t.length >= 3 && !/\d/.test(t) && !/\b(test|abc|xyz|demo|dummy|guest|trial|sample|user|app)\b/i.test(t),
    );
    const pool = logical.length ? logical : labels.filter(t => t && t !== 'Select');
    if (!pool.length) throw new Error('No selectable options found');
    const label = pool[Math.floor(Math.random() * pool.length)];
    await select.selectOption({ label });
    return label;
  }

  async fillForm(data: {
    salesPerson?: RegExp | string;
    manager?: RegExp | string;
    total?: string;
    year?: string;
    months?: Record<string, string>;
  }): Promise<string> {
    await this.salesPerson.waitFor({ state: 'visible' });

    // Sales Person — RANDOM non-Select option when omitted
    let chosenSalesPerson = '';
    if (data.salesPerson === undefined) {
      chosenSalesPerson = await this.selectRandomLogicalPerson(this.salesPerson);
      console.log(`Sales Person (random): ${chosenSalesPerson}`);
    } else if (typeof data.salesPerson === 'string') {
      await this.salesPerson.selectOption({ label: data.salesPerson });
      chosenSalesPerson = data.salesPerson;
    } else {
      chosenSalesPerson = await this.selectOptionByText(this.salesPerson, data.salesPerson);
    }

    if (data.manager !== undefined) {
      if (typeof data.manager === 'string') {
        await this.reportTo.selectOption({ label: data.manager });
      } else {
        await this.selectOptionByText(this.reportTo, data.manager);
      }
    }
    // assign_to left as default Sonam Burbure (only used in bulk)

    if (data.total !== undefined) await this.totalSalesTarget.fill(data.total);
    if (data.year !== undefined) await this.targetYear.fill(data.year);
    if (data.months) {
      for (const [month, value] of Object.entries(data.months)) {
        await this.monthInput(month).fill(value);
      }
    }
    return chosenSalesPerson;
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }
  async searchSalesTargets(filters: { person?: string; total?: string }) {
    if (filters.person) await this.selectPersonFilter(filters.person);
    if (filters.total) await this.searchTotalInput.fill(filters.total);
    await this.searchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Sales Person filter is a dropdown — select the option, never type into it.
  // Falls back to the placeholder textbox only if no select is rendered.
  private async selectPersonFilter(person: string) {
    const header = this.page.locator('th, [role="columnheader"]').filter({ hasText: /^Sales Person/ }).first();
    const select = header.locator('select').first();
    if (await select.count() > 0) {
      await select.selectOption({ label: person });
    } else {
      await this.searchPersonInput.fill(person);
    }
  }

  async createSalesTarget(data: Parameters<SalesTargetPage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    const chosen = await this.fillForm(data);
    await this.save();
    return chosen;
  }

  // -- Row actions (list page) -----------------------------
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye)
  // Rows pin by unique TOTAL (person repeats across runs, like phone in other suites).
  rowByName(person = '', total?: string): Locator {
    let row = this.page.locator('tbody tr');
    if (person) row = row.filter({ hasText: person });
    if (total) row = row.filter({ hasText: total });
    return row.first();
  }

  private rowActionIcon(person = '', index: number, total?: string): Locator {
    return this.rowByName(person, total).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(person = '', total?: string) {
    await this.rowActionIcon(person, 0, total).click();
    await this.totalSalesTarget.waitFor({ state: 'visible' });
  }

  async clickDuplicate(person = '', total?: string) {
    await this.rowActionIcon(person, 1, total).click();
    await this.totalSalesTarget.waitFor({ state: 'visible' });
  }

  async clickView(person = '', total?: string) {
    await this.rowActionIcon(person, 2, total).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the sales-target detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/salestargets\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.totalSalesTarget.waitFor({ state: 'visible' });
  }

  async findSalesTarget(person = '', total?: string) {
    await this.navigateToList();
    // Total is unique per run — search by it, not by person (person repeats across runs)
    await this.searchSalesTargets(total ? { total } : person ? { person } : {});
    await this.rowByName(person, total).waitFor({ state: 'visible', timeout: 15000 });
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
