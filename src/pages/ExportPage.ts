import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ Robust click for Jenkins
   private async clickSelectActions() {
  const btn = this.page.locator('button:has-text("Select Actions")').first();
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`⚡ Attempt ${attempt} to click Select Actions`);

      // ✅ Wait for page stable
      await this.page.waitForLoadState('domcontentloaded');

      // ✅ Wait for button visible
      await btn.waitFor({ state: 'visible', timeout: 60000 });

      // ✅ Scroll into view
      await btn.scrollIntoViewIfNeeded();

      // ✅ Force click (Playwright way)
      await btn.click({ force: true });

      // ✅ Verify dropdown opened
      const dropdownOpened = await this.page.locator('a:has-text("Export")').first().isVisible();

      if (!dropdownOpened) {
        throw new Error("Dropdown did not open");
      }

      console.log("✅ Select Actions clicked successfully");
      return;

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Attempt ${attempt} failed: ${msg}`);

      if (attempt === maxAttempts) {
        throw new Error("❌ Failed to click Select Actions after retries");
      }

      // Small retry wait
      await this.page.waitForTimeout(2000);
    }
  }
}

  async exportModuleByUrl(testInfo: TestInfo, moduleUrl: string, moduleExportLinkText: string) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      // ✅ Better navigation wait
      await this.page.goto(moduleUrl, { waitUntil: 'networkidle' });

      console.log('🌐 Current URL:', this.page.url());

      // ✅ Extra wait for slow Jenkins UI
      await this.page.waitForTimeout(5000);

      // ✅ Click Select Actions (robust)
      await this.clickSelectActions();

      // Wait for dropdown to open
      await this.page.waitForTimeout(2000);

      // ✅ Click Export option
      const exportOption = this.page.locator(`//a[normalize-space()='${moduleExportLinkText}']`).first();

      await exportOption.waitFor({ state: 'visible', timeout: 30000 });

      await exportOption.click();

      console.log(`✅ Clicked ${moduleExportLinkText}`);

      // ✅ Download handling
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        this.page.locator("(//button[normalize-space()='Export'])[1]").click()
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();

      console.log(`📥 Downloaded: ${fileName}`);

      // Attach screenshot
      const screenshot = await this.page.screenshot();
      await testInfo.attach(`${moduleExportLinkText} Screenshot`, {
        body: screenshot,
        contentType: 'image/png'
      });

      // Attach file
      await testInfo.attach(`${moduleExportLinkText} File`, {
        path: filePath!
      });

    } catch (error) {
      console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);

      console.log('🌐 Failed URL:', this.page.url());

      // ✅ Safe screenshot (fix unknown error)
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        await testInfo.attach(`Failure Screenshot - ${moduleExportLinkText}`, {
          body: screenshot,
          contentType: 'image/png'
        });
      } catch (screenshotError) {
        const msg = screenshotError instanceof Error ? screenshotError.message : String(screenshotError);
        console.warn('⚠️ Screenshot failed:', msg);
      }

      throw error;
    }
  }
}