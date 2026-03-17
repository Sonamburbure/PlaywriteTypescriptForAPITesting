import { Page, Locator } from '@playwright/test';

export class LoginPage {

  readonly page: Page;
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly loginButton: Locator;
  readonly menu: Locator;

  constructor(page: Page) {

    this.page = page;

    this.emailField = page.getByPlaceholder('Email');
    this.passwordField = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.menu = page.locator("i[role='button'] svg");

  }

  async login(email: string, password: string) {

    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.loginButton.click();

  }

  async openMenu() {

    await this.menu.waitFor({ state: 'visible' });
    await this.menu.click();

  }

}