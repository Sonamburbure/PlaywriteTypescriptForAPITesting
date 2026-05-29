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

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createAccountBtn = page.getByRole('button', { name: 'Create Account' });
    this.searchNameInput  = page.getByPlaceholder('Account Name');
    this.searchPhoneInput = page.getByPlaceholder('Phone Number');
    this.searchEmailInput = page.getByPlaceholder('Email Address');
    this.searchTownInput  = page.getByPlaceholder('Town');
    this.searchBtn        = page.getByRole('button', { name: 'Search' });

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
  }

  async navigateToList() {
    await this.page.goto('https://web.automateevents.com/#/home/accounts');
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
}
