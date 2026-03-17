
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

    this.plusIcon = page.locator("//div[@class='crncydiv location_add']//i");
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

    const barNames = [
      "VibeBar",
      
      "GlowDrinks",
      
      
      
      "MoodMixer",
      
    ];

    const randomName = barNames[Math.floor(Math.random() * barNames.length)];

    // JavaScript scroll to bottom
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await this.page.waitForTimeout(1500);

    await this.plusIcon.click();

    await this.barNameInput.fill(randomName);

    // Select Bar Setup
    await this.barSetupSearch.click();
    await this.weddingThemeBar.click();

    // Select Menu
    await this.menuSearch.click();
    await this.confirmButton.click();

    await this.menuSearchInput.fill("Delecious");
    await this.deliciousFood.click();

    await this.saveButton.click();

    console.log(`✅ Barcard created: ${randomName}`);

    await this.page.waitForTimeout(3000);
    await this.page.reload();
  }

  async createAutoPreplan() {

    await this.moreButton.click();
    await this.createPrePlanning.click();

    await this.confirmButton.click();

    await this.page.getByText(/Pre Planning/i).waitFor({ timeout: 20000 });

    console.log("✅ Auto Preplan created successfully");
  }

}

