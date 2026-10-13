import { Page, Locator } from '@playwright/test';

export class SupplierPage {
  readonly page: Page;

  // List page — Create button
  readonly createSupplierBtn: Locator;

  // List page — Search filters
  readonly searchNameInput: Locator;
  readonly searchRefInput: Locator;
  readonly searchStatusSelect: Locator;
  readonly searchCategorySelect: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Basic Information
  readonly supplierName: Locator;
  readonly status: Locator;
  readonly category: Locator;
  readonly rating: Locator;
  readonly assignedTo: Locator;

  // Address Details
  readonly streetAddress: Locator;
  readonly town: Locator;
  readonly postCode: Locator;
  readonly countySearchInput: Locator;
  readonly country: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createSupplierBtn    = page.getByRole('button', { name: 'Create Supplier' });
    this.searchNameInput      = page.getByPlaceholder('Supplier Name');
    this.searchRefInput       = page.getByPlaceholder('Ref');
    this.searchStatusSelect   = page.locator('table select').nth(0);
    this.searchCategorySelect = page.locator('table select').nth(1);
    this.searchBtn            = page.getByRole('button', { name: 'Search' });
    this.selectActions        = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn       = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Basic Information
    this.supplierName = page.locator("input[name='supplier_name']");
    this.status       = page.locator("select[name='supplier_status']");
    this.category     = page.locator("select[name='supplier_category']");
    this.rating       = page.locator("select[name='supplier_rating']");
    this.assignedTo   = page.locator("select[name='assign_to']");

    // Address Details
    this.streetAddress     = page.locator("textarea[name='supplier_address']");
    this.town              = page.locator("input[name='supplier_city']");
    this.postCode          = page.locator("input[name='supplier_post_code']");
    // County — React Select combobox
    this.countySearchInput = page.locator("input[id^='react-select-'][id$='-input']").first();
    this.country           = page.locator("select[name='supplier_country']");

    // Buttons
    this.saveBtn   = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/suppliers/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it didn't
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/suppliers`);
    try {
      await this.createSupplierBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createSupplierBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createSupplierBtn.waitFor({ state: 'visible' });
    await this.createSupplierBtn.click();
  }

  async selectCounty(countyName: string) {
    await this.countySearchInput.click();
    await this.countySearchInput.fill(countyName);
    const option = this.page.locator('[role="option"]').filter({ hasText: countyName }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  // Selects the first <option> whose text matches, e.g. /^Christopher\w* White$/ also matches 'Christophersss White'
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
    name: string;
    status?: RegExp;
    address?: string;
    town?: string;
    postCode?: string;
    county?: string;
  }): Promise<{ status: string; category: string; rating: string }> {
    await this.supplierName.waitFor({ state: 'visible' });
    await this.supplierName.fill(data.name);

    const status = data.status
      ? await this.selectOptionByText(this.status, data.status)
      : await this.selectOptionByText(this.status, /^Active$/);
    const category = await this.selectRandomOption(this.category);
    const rating   = await this.selectRandomOption(this.rating);

    if (data.address)  await this.streetAddress.fill(data.address);
    if (data.town)     await this.town.fill(data.town);
    if (data.postCode) await this.postCode.fill(data.postCode);
    if (data.county)   await this.selectCounty(data.county);

    return { status, category, rating };
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  async searchSuppliers(filters: { name?: string; ref?: string }) {
    if (filters.name) await this.searchNameInput.fill(filters.name);
    if (filters.ref)  await this.searchRefInput.fill(filters.ref);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createSupplier(data: Parameters<SupplierPage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    const selected = await this.fillForm(data);
    await this.save();
    return selected;
  }

  // ── Row actions (list page) ─────────────────────────────
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye), Delete (bin)
  // Optional ref narrows the match when other suppliers share the same name
  rowByName(name: string, ref?: string): Locator {
    let row = this.page.locator('tbody tr').filter({ hasText: name });
    if (ref) row = row.filter({ hasText: ref });
    return row.first();
  }

  private rowActionIcon(name: string, index: number, ref?: string): Locator {
    return this.rowByName(name, ref).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(name: string, ref?: string) {
    await this.rowActionIcon(name, 0, ref).click();
    await this.supplierName.waitFor({ state: 'visible' });
  }

  async clickDuplicate(name: string, ref?: string) {
    await this.rowActionIcon(name, 1, ref).click();
    await this.supplierName.waitFor({ state: 'visible' });
  }

  async clickView(name: string, ref?: string) {
    await this.rowActionIcon(name, 2, ref).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the supplier detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/suppliers\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.supplierName.waitFor({ state: 'visible' });
  }

  async findSupplier(name: string, ref?: string) {
    await this.navigateToList();
    await this.searchSuppliers({ name });
    await this.rowByName(name, ref).waitFor({ state: 'visible', timeout: 15000 });
  }

  // ── Bulk edit (list page) ───────────────────────────────
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
    await this.page.waitForLoadState('networkidle');
  }
}
