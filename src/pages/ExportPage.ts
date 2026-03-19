import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ Robust click (final stable version)
  private async clickSelectActions() {
    const btn = this.page.locator('#dropdown-basic3');

    try {
      console.log("⚡ Trying force click...");

      await btn.waitFor({ state: 'attached', timeout: 60000 });

      await btn.scrollIntoViewIfNeeded();

      await btn.click({ force: true });

      console.log("✅ Clicked using force click");

    } catch (error) {
      console.log("⚠️ Force click failed → trying JS click");

      await this.page.evaluate(() => {
        const el = document.querySelector('#dropdown-basic3') as HTMLElement;
        if (el) {
          el.click();
        } else {
          throw new Error("Select Actions button not found in DOM");
        }
      });

      console.log("✅ Clicked using JS");
    }

    // ✅ Confirm dropdown opened
    await this.page.waitForSelector("//a[contains(text(),'Export')]", {
      timeout: 30000
    });

    console.log("✅ Dropdown opened successfully");
  }

  async exportModuleByUrl(testInfo: TestInfo, moduleUrl: string, moduleExportLinkText: string) {
  try {
    console.log(`🚀 Navigating to: ${moduleUrl}`);

    await this.page.goto(moduleUrl);

    await this.page.waitForLoadState('domcontentloaded');

    console.log('🌐 Current URL:', this.page.url());
    console.log('📄 Page title:', await this.page.title());

    // ✅ Wait for page to stabilize
    await this.page.waitForSelector('body', { timeout: 60000 });

    // ✅ DEBUG: check if button exists at all
    const btnCount = await this.page.locator('#dropdown-basic3').count();
    console.log("🔍 Select Actions button count:", btnCount);

    if (btnCount === 0) {
      throw new Error("❌ Button not present → Page not loaded properly (likely login/session issue)");
    }

    // ✅ Click
    await this.clickSelectActions();

    // Export option
    const exportOption = this.page.locator(`//a[normalize-space()='${moduleExportLinkText}']`).first();

    await exportOption.waitFor({ state: 'visible', timeout: 30000 });
    await exportOption.click();

    console.log(`✅ Clicked ${moduleExportLinkText}`);

    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 60000 }),
      this.page.locator("(//button[normalize-space()='Export'])[1]").click()
    ]);

    console.log(`📥 Downloaded: ${download.suggestedFilename()}`);

  } catch (error) {
    console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);

    console.log("🌐 Final URL:", this.page.url());
    console.log("📄 Final title:", await this.page.title());

    throw error;
  }
}}