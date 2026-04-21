import { Page, Locator, expect } from '@playwright/test';

export class BarcardAndAutoPreplanPage {

  readonly page: Page;

  readonly plusIcon: Locator;
  readonly barNameInput: Locator;

  readonly barSetupSearch: Locator;
  readonly weddingThemeBar: Locator;

  readonly menuSearch: Locator;
  readonly confirmButton: Locator;
  readonly menuSearchInput: Locator;
  readonly deliciousFood: Locator;

  readonly saveButton: Locator;

  readonly moreButton: Locator;
  readonly createPrePlanning: Locator;

  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.plusIcon = page.locator("//div[@class='crncydiv location_add']//i").first();
    this.barNameInput = page.locator("//input[@placeholder='Put Bar Name']");

    this.barSetupSearch = page.locator("(//span[@id='btn-search'])[2]");
    this.weddingThemeBar = page.locator("//td[normalize-space()='WeddingThemeBar']");

    this.menuSearch = page.locator("(//span[@id='btn-search'])[4]");
    this.confirmButton = page.locator("//button[normalize-space()='Confirm']");

    this.menuSearchInput = page.locator("//input[@placeholder='Min 4 Characters']");
    this.deliciousFood = page.locator("//td[normalize-space()='Delecious food']");

    this.saveButton = page.locator("//span[normalize-space()='Save']");

    this.moreButton = page.locator("(//button[normalize-space()='More'])[1]");
    this.createPrePlanning = page.locator("//a[normalize-space()='Create Pre Planning']");

    this.successMessage = page.locator("text=Pre Planning Sucessfully Created");
  }

  async createBarCard() {

    const barNames = ["VibeBar", "GlowDrinks", "MoodMixer"];
    const randomName = barNames[Math.floor(Math.random() * barNames.length)];

    // Scroll safely
    await this.page.mouse.wheel(0, 5000);

    // ✅ Wait + click (important for Jenkins)
    await this.plusIcon.waitFor({ state: 'visible', timeout: 120000 });
    await this.plusIcon.click({ force: true });

    await this.barNameInput.waitFor({ state: 'visible' });
    await this.barNameInput.fill(randomName);

    // Bar Setup
    await this.barSetupSearch.waitFor({ state: 'visible' });
    await this.barSetupSearch.click({ force: true });

    await this.weddingThemeBar.waitFor({ state: 'visible' });
    await this.weddingThemeBar.click({ force: true });

    // Menu Selection
    await this.menuSearch.waitFor({ state: 'visible' });
    await this.menuSearch.click({ force: true });

    await this.confirmButton.waitFor({ state: 'visible' });
    await this.confirmButton.click({ force: true });

    await this.menuSearchInput.waitFor({ state: 'visible' });
    await this.menuSearchInput.fill("Delecious");

    await this.deliciousFood.waitFor({ state: 'visible' });
    await this.deliciousFood.click({ force: true });

    await this.saveButton.waitFor({ state: 'visible' });
    await this.saveButton.click({ force: true });

    console.log(`✅ Barcard created: ${randomName}`);

    // ✅ Wait for save to complete instead of static wait
    await this.page.waitForLoadState('networkidle');

    await this.page.reload();
  }

  async createAutoPreplan() {

    await this.moreButton.waitFor({ state: 'visible', timeout: 120000 });
    await this.moreButton.click({ force: true });

    await this.createPrePlanning.waitFor({ state: 'visible' });
    await this.createPrePlanning.click({ force: true });

    await this.confirmButton.waitFor({ state: 'visible' });
    await this.confirmButton.click({ force: true });

    // ✅ Proper validation instead of blind wait
    await expect(this.successMessage).toBeVisible({ timeout: 30000 });

    console.log("✅ Auto Preplan created successfully");
  }
}