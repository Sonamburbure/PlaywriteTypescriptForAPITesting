import { Page, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ Robust click for Jenkins (FINAL)
  private async clickSelectActions() {
    const btn = this.page.locator('#dropdown-basic3');

    // ✅ Wait for button container (Angular render fix)
    await this.page.waitForSelector('div.btn_actions.dropdown', { timeout: 60000 });

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

      console.log('🌐 Current URL:', this.page.url());

      // ✅ IMPORTANT: Wait for Angular UI (NOT timeout)
      await this.page.waitForSelector('div.btn_actions.dropdown', { timeout: 60000 });

      // Optional debug
      // console.log(await this.page.locator('button').allTextContents());

      // ✅ Click Select Actions
      await this.clickSelectActions();

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