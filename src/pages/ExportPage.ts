import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ Robust click for Jenkins
private async clickSelectActions() {
  const btn = this.page.locator('#dropdown-basic3');

  try {
    console.log("⚡ Trying normal force click...");

    // Wait until attached (NOT visible)
    await btn.waitFor({ state: 'attached', timeout: 60000 });

    // Scroll (important for headless)
    await btn.scrollIntoViewIfNeeded();

    // Force click (Playwright way)
    await btn.click({ force: true });

    console.log("✅ Clicked using force click");

  } catch (error) {
    console.log("⚠️ Force click failed → trying JS click");

    // 🔥 Hard JS click (bypass everything)
    await this.page.evaluate(() => {
      const btn = document.querySelector('#dropdown-basic3') as HTMLElement;
      if (btn) {
        btn.click();
      } else {
        throw new Error("Select Actions button not found in DOM");
      }
    });

    console.log("✅ Clicked using JS");
  }

  // ✅ Confirm dropdown opened (VERY IMPORTANT)
  await this.page.waitForSelector("//a[contains(text(),'Export')]", {
    timeout: 30000
  });

  console.log("✅ Dropdown opened successfully");
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
  }}
