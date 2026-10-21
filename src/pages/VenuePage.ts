import { Page, Locator } from '@playwright/test';

export class VenuePage {
  readonly page: Page;

  // List page — Create button
  readonly createVenueBtn: Locator;

  // List page — Search filters
  readonly searchNameInput: Locator;
  readonly searchRefInput: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Basic Information
  readonly venueName: Locator;
  readonly venuePhone: Locator;
  readonly venueEmail: Locator;
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
    this.createVenueBtn = page.getByRole('button', { name: 'Create Venue' });
    this.searchNameInput = page.getByPlaceholder('Venue Name');
    this.searchRefInput = page.getByPlaceholder('Ref');
    this.searchBtn = page.getByRole('button', { name: 'Search' });
    this.selectActions = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Basic Information
    this.venueName = page.locator("input[name='venue_name']");
    this.venuePhone = page.locator("input[name='venue_phone']");
    this.venueEmail = page.locator("input[name='venue_email']");
    this.assignedTo = page.locator("select[name='assign_to']");

    // Address Details
    this.streetAddress = page.locator("textarea[name='venue_address']");
    this.town = page.locator("input[name='venue_city']");
    this.postCode = page.locator("input[name='venue_post_code']");
    // County — React Select combobox
    this.countySearchInput = page.locator("input[id^='react-select-'][id$='-input']").first();
    this.country = page.locator("select[name='venue_country']");

    // Buttons
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/venues/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/venues`);
    try {
      await this.createVenueBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createVenueBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createVenueBtn.waitFor({ state: 'visible' });
    await this.createVenueBtn.click();
  }

  async selectCounty(countyName: string) {
    await this.countySearchInput.click();
    await this.countySearchInput.fill(countyName);
    const option = this.page.locator('[role="option"]').filter({ hasText: countyName }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
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
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    town?: string;
    postCode?: string;
    county?: string;
  }) {
    await this.venueName.waitFor({ state: 'visible' });
    await this.venueName.fill(data.name);

    if (data.phone) await this.venuePhone.fill(data.phone);
    if (data.email) await this.venueEmail.fill(data.email);
    // assign_to left as default Sonam Burbure (only used in bulk), venue_country left as default United Kingdom
    // Ref is AUTO GENERATED — never fill

    if (data.address) await this.streetAddress.fill(data.address);
    if (data.town) await this.town.fill(data.town);
    if (data.postCode) await this.postCode.fill(data.postCode);
    if (data.county) await this.selectCounty(data.county);
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  async searchVenues(filters: { name?: string; ref?: string }) {
    if (filters.name) await this.searchNameInput.fill(filters.name);
    if (filters.ref) await this.searchRefInput.fill(filters.ref);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createVenue(data: Parameters<VenuePage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    await this.save();
  }

  // -- Row actions (list page) -----------------------------
  // -- Row actions (list page) -----------------------------
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye)
  // Phone is NOT a list column — rows match by unique name only
  rowByName(name: string, _phone?: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: name }).first();
  }

  private rowActionIcon(name: string, index: number, phone?: string): Locator {
    return this.rowByName(name, phone).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(name: string, phone?: string) {
    await this.rowActionIcon(name, 0, phone).click();
    await this.venueName.waitFor({ state: 'visible' });
  }

  async clickDuplicate(name: string, phone?: string) {
    await this.rowActionIcon(name, 1, phone).click();
    await this.venueName.waitFor({ state: 'visible' });
  }

  async clickView(name: string, phone?: string) {
    await this.rowActionIcon(name, 2, phone).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the venue detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/venues\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.venueName.waitFor({ state: 'visible' });
  }

  async findVenue(name: string, phone?: string) {
    await this.navigateToList();
    await this.searchVenues({ name });
    await this.rowByName(name, phone).waitFor({ state: 'visible', timeout: 15000 });
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
    await this.page.waitForLoadState('networkidle');
  }
}
