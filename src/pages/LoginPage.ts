import { Page } from '@playwright/test';

export class LoginPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Locators
  private emailInput = '#email';
  private passwordInput = '#password';
  private loginButton = 'button[type="submit"]';

  async navigate(url: string) {
    await this.page.goto(url);
  }

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }

  async waitForHomePage() {
    await this.page.waitForURL('**/home');
  }
}