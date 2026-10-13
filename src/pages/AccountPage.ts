import { Page, Locator } from '@playwright/test';

export class AccountPage {
  readonly page: Page;

  // List page — Create button
  readonly createAccountBtn: Locator;

  // List page — Search filters
  readonly searchNameInput: Locator;
  readonly searchPhoneInput: Locator;
  readonly searchEmailInput: Locator;
  readonly searchTownInput: Locator;
  readonly searchBtn: Locator;
  readonly searchAssignedToSelect: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Account Information
  readonly accountName: Locator;
  readonly phoneNumber: Locator;
  readonly emailAddress: Locator;
  readonly assignedTo: Locator;

  // Address Details
  readonly streetAddress: Locator;
  readonly town: Locator;
  readonly postCode: Locator;
  readonly countyDropdown: Locator;
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
    this.createAccountBtn = page.getByRole('button', { name: 'Create Account' });
    this.searchNameInput  = page.getByPlaceholder('Account Name');
    this.searchPhoneInput = page.getByPlaceholder('Phone Number');
    this.searchEmailInput = page.getByPlaceholder('Email Address');
    this.searchTownInput  = page.getByPlaceholder('Town');
    this.searchBtn        = page.getByRole('button', { name: 'Search' });
    this.searchAssignedToSelect = page.locator('table select').first();
    this.selectActions    = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn   = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Account Information
    this.accountName  = page.locator("input[name='customer_name']");
    this.phoneNumber  = page.locator("input[name='customer_phone']");
    this.emailAddress = page.locator("input[name='customer_email']");
    this.assignedTo   = page.locator("select[name='assign_to']");

    // Address Details
    this.streetAddress   = page.locator("textarea[name='customer_address']");
    this.town            = page.locator("input[name='customer_city']");
    this.postCode        = page.locator("input[name='customer_post_code']");
    // County — React Select combobox
    this.countyDropdown    = page.locator('#react-select-2-input');
    this.countySearchInput = page.locator('#react-select-2-input');
    this.country         = page.locator("select[name='customer_country']");

    // Buttons
    this.saveBtn   = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/accounts/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it didn't
  async navigateToList() {
    await this.page.goto('https://web.automateevents.com/#/home/accounts');
    try {
      await this.createAccountBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createAccountBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createAccountBtn.waitFor({ state: 'visible' });
    await this.createAccountBtn.click();
  }

  async selectCounty(countyName: string) {
    await this.countySearchInput.click();
    await this.countySearchInput.fill(countyName);
    const option = this.page.locator('[role="option"]').filter({ hasText: countyName }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async fillForm(data: {
    name: string;
    phone: string;
    email: string;
    address?: string;
    town?: string;
    postCode?: string;
    county?: string;
  }) {
    await this.accountName.waitFor({ state: 'visible' });
    await this.accountName.fill(data.name);
    await this.phoneNumber.fill(data.phone);
    await this.emailAddress.fill(data.email);

    if (data.address)  await this.streetAddress.fill(data.address);
    if (data.town)     await this.town.fill(data.town);
    if (data.postCode) await this.postCode.fill(data.postCode);
    if (data.county)   await this.selectCounty(data.county);
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  async searchAccounts(filters: { name?: string; phone?: string; email?: string; town?: string }) {
    if (filters.name)  await this.searchNameInput.fill(filters.name);
    if (filters.phone) await this.searchPhoneInput.fill(filters.phone);
    if (filters.email) await this.searchEmailInput.fill(filters.email);
    if (filters.town)  await this.searchTownInput.fill(filters.town);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createAccount(data: {
    name: string;
    phone: string;
    email: string;
    address?: string;
    town?: string;
    postCode?: string;
    county?: string;
  }) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    await this.save();
  }

  // ── Row actions (list page) ─────────────────────────────
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye), Delete (bin)
  // Optional phone narrows the match when other accounts share the same name
  rowByName(name: string, phone?: string): Locator {
    let row = this.page.locator('tbody tr').filter({ hasText: name });
    if (phone) row = row.filter({ hasText: phone });
    return row.first();
  }

  private rowActionIcon(name: string, index: number, phone?: string): Locator {
    return this.rowByName(name, phone).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(name: string, phone?: string) {
    await this.rowActionIcon(name, 0, phone).click();
    await this.accountName.waitFor({ state: 'visible' });
  }

  async clickDuplicate(name: string, phone?: string) {
    await this.rowActionIcon(name, 1, phone).click();
    await this.accountName.waitFor({ state: 'visible' });
  }

  async clickView(name: string, phone?: string) {
    await this.rowActionIcon(name, 2, phone).click();
    await this.page.waitForURL(/#\/home\/accounts\/detail\/\d+/);
    await this.page.waitForLoadState('networkidle');
  }

  // After Save the app redirects to the account detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/accounts\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.accountName.waitFor({ state: 'visible' });
  }

  async findAccount(name: string, phone?: string) {
    await this.navigateToList();
    await this.searchAccounts({ name });
    await this.rowByName(name, phone).waitFor({ state: 'visible', timeout: 15000 });
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

  // Selects the first <option> whose text matches, e.g. /^Christopher\w* White$/ also matches 'Christophersss White'
  async selectOptionByText(select: Locator, text: RegExp): Promise<string> {
    const labels = (await select.locator('option').allInnerTexts()).map(t => t.trim());
    const label = labels.find(t => text.test(t));
    if (!label) throw new Error(`No option matching ${text} — available: ${labels.join(', ')}`);
    await select.selectOption({ label });
    return label;
  }

  async clearSearch() {
    await this.clearSearchBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async searchByAssignedTo(user: RegExp, filters: { name?: string; phone?: string } = {}): Promise<string> {
    await this.navigateToList();
    const label = await this.selectOptionByText(this.searchAssignedToSelect, user);
    if (filters.name)  await this.searchNameInput.fill(filters.name);
    if (filters.phone) await this.searchPhoneInput.fill(filters.phone);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
    return label;
  }
}
