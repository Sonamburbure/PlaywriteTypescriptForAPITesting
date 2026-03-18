import { Page, expect, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;
  readonly Export: any;

  constructor(page: Page) {
    this.page = page;
    this.Export = page.locator("(//button[normalize-space()='Export'])[1]");
  }

  // ✅ Generic click with retry and JS fallback for Jenkins/headless
  private async clickWithRetry(locator: string, attempts: number = 5, waitMs: number = 2000) {
    for (let i = 1; i <= attempts; i++) {
      try {
        const el = this.page.locator(locator);
        await el.waitFor({ state: 'visible', timeout: 20000 });

        const handle = await el.elementHandle();
        if (!handle) throw new Error(`Element not found: ${locator}`);

        await this.page.evaluate((el) => {
          const htmlEl = el as HTMLElement; // ✅ TypeScript-safe
          htmlEl.scrollIntoView({ block: 'center', inline: 'center' });
          htmlEl.click();
        }, handle);

        console.log(`✅ Clicked ${locator} on attempt ${i}`);
        return;
      } catch (error) {
        console.warn(`⚠️ Attempt ${i} failed for ${locator}: ${error}`);
        if (i === attempts) throw new Error(`Failed to click ${locator} after ${attempts} attempts`);
        await this.page.waitForTimeout(waitMs);
      }
    }
  }

  async exportModuleByUrl(testInfo: TestInfo, moduleUrl: string, moduleExportLinkText: string) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      // 1️⃣ Navigate
      await this.page.goto(moduleUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');

      console.log('🌐 Current URL:', this.page.url());
      await this.page.waitForTimeout(3000);

      // 2️⃣ Click "Select Actions"
      const selectActionLocator = "button#dropdown-basic3.btn-more.dropdown-toggle.btn.btn-primary";
      await this.clickWithRetry(selectActionLocator, 5, 2000);

      await this.page.waitForTimeout(1000); // wait for dropdown

      // 3️⃣ Click Export link
      const exportLinkLocator = `(//a[normalize-space()='${moduleExportLinkText}'])[1]`;
      await this.clickWithRetry(exportLinkLocator, 5, 2000);

      // 4️⃣ Download
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        this.Export.click()
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();
      console.log(`📥 Downloaded file for ${moduleExportLinkText}:`, fileName);

      const content = fs.readFileSync(filePath!, 'utf-8');

      const screenshot = await this.page.screenshot();
      await testInfo.attach(`${moduleExportLinkText} Export Screenshot`, {
        body: screenshot,
        contentType: 'image/png'
      });

      await testInfo.attach(`${moduleExportLinkText} Downloaded File`, {
        path: filePath!
      });

      if (!fileName.match(/\.xlsx|\.csv/)) {
        console.warn(`⚠️ Export warning for ${moduleExportLinkText}: File is not Excel/CSV`);
      } else if (content.includes('Automate Events')) {
        console.warn(`⚠️ Export warning for ${moduleExportLinkText}: HTML instead of file`);
      } else {
        console.log(`✅ Export of ${moduleExportLinkText} successful`);
      }
    } catch (error) {
      console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);

      console.log('🌐 Failed URL:', this.page.url());
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        await testInfo.attach(`❌ Failure Screenshot - ${moduleExportLinkText}`, {
          body: screenshot,
          contentType: 'image/png'
        });
      } catch {
        console.warn('⚠️ Failed to capture screenshot');
      }

      throw error;
    }
  }
}