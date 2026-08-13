import { Page, Locator } from '@playwright/test';

export class UserPage {
  readonly page: Page;

  readonly createUserBtn: Locator;

  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly password: Locator;
  readonly emailAddress: Locator;
  readonly roleDropdown: Locator;

  readonly saveBtn: Locator;

  readonly searchEmailInput: Locator;
  readonly searchBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.createUserBtn = page.getByRole('button', { name: 'Create User' });

    this.firstName    = this.fieldByLabel('First Name');
    this.lastName     = this.fieldByLabel('Last Name');
    this.password     = this.fieldByLabel('Password');
    this.emailAddress = this.fieldByLabel('Email Address');
    this.roleDropdown = this.selectByLabel('Role');

    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();

    this.searchEmailInput = page.getByPlaceholder('Email Address');
    this.searchBtn        = page.getByRole('button', { name: 'Search' });
  }

  private fieldByLabel(label: string): Locator {
    return this.page.locator(`:text("${label}")`).locator('xpath=following::input[1]');
  }

  private selectByLabel(label: string): Locator {
    return this.page.locator(`:text("${label}")`).locator('xpath=following::select[1]');
  }

  async navigateToList() {
    //await this.page.goto('https://web.automateevents.com/#/home/user-list');
    await this.page.goto('https://stage-ui.automateevents.com/#/home/user-list')
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createUserBtn.waitFor({ state: 'visible' });
    await this.createUserBtn.click();
  }

  async fillForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.firstName.waitFor({ state: 'visible' });
    await this.firstName.fill(data.firstName);
    await this.lastName.fill(data.lastName);
    await this.password.fill(data.password);
    await this.emailAddress.fill(data.email);
    await this.roleDropdown.selectOption({ label: 'User' });
  }

  async save() {
    this.page.once('dialog', dialog => dialog.accept());

    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();

    const okBtn = this.page.getByRole('button', { name: 'OK' });
    try {
      await okBtn.waitFor({ state: 'visible', timeout: 5000 });
      await okBtn.click();
    } catch {
      // no DOM confirmation dialog appeared
    }
  }

  async searchByEmail(email: string) {
    await this.searchEmailInput.fill(email);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    await this.save();
  }
}
