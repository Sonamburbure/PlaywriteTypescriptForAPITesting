import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ Robust click for Jenkins
  private async clickSelectActions() {
    const locator = this.page.locator('button#dropdown-basic3');
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`⚡ Attempt ${attempt} to click Select Actions`);

        // Wait for element in DOM
        await locator.waitFor({ state: 'attached', timeout: 60000 });

        // Scroll into view
        await locator.scrollIntoViewIfNeeded();

        // Small wait (important for Jenkins)
        await this.page.waitForTimeout(1000);

        const handle = await locator.elementHandle();
        if (!handle) throw new Error('Element handle not found');

        // ✅ JS click (best for headless)
        await this.page.evaluate((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.click();
        }, handle);

        console.log('✅ Select Actions clicked');
        return;

      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ Attempt ${attempt} failed: ${msg}`);

        if (attempt === maxAttempts) {
          throw new Error('❌ Failed to click Select Actions after retries');
        }

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