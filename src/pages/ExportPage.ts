import { Page, expect } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;
  readonly Export: any;

  constructor(page: Page) {
    this.page = page;
    this.Export = page.locator("(//button[normalize-space()='Export'])[1]");
  }

  async exportModuleByUrl(testInfo: any, moduleUrl: string, moduleExportLinkText: string) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      // 1️⃣ Navigate
      await this.page.goto(moduleUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');

      console.log('🌐 Current URL:', this.page.url());

      // 🔥 EXTRA WAIT (very important like Selenium)
      await this.page.waitForTimeout(3000);

      // 2️⃣ Select Actions button (USE SAME XPATH as Selenium)
      const selectActionButton = this.page.locator("(//button[normalize-space()='Select Actions'])[1]");

      // 🔥 Wait for element to be present in DOM
      await selectActionButton.waitFor({ state: 'attached', timeout: 60000 });

      // 🔥 Scroll like Selenium
      await selectActionButton.scrollIntoViewIfNeeded();

      // 🔥 Ensure visible
      await expect(selectActionButton).toBeVisible({ timeout: 30000 });

      // 🔥 Click with fallback (same as Selenium)
      try {
        await selectActionButton.click();
      } catch (e) {
        console.log('⚠️ Normal click failed, using JS click for Select Actions');

        await this.page.evaluate(() => {
          const btn = document.evaluate(
            "(//button[normalize-space()='Select Actions'])[1]",
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue as HTMLElement;

          if (btn) btn.click();
        });
      }

      // Small wait for dropdown
      await this.page.waitForTimeout(1000);

      // 3️⃣ Export link
      const exportModuleLocator = this.page.locator(`(//a[normalize-space()='${moduleExportLinkText}'])[1]`);

      // 🔥 Wait for DOM attach first
      await exportModuleLocator.waitFor({ state: 'attached', timeout: 30000 });

      await expect(exportModuleLocator).toBeVisible({ timeout: 30000 });

      // 🔥 Click with fallback
      try {
        await exportModuleLocator.click();
      } catch (e) {
        console.log('⚠️ Normal click failed, using JS click for Export option');

        await this.page.evaluate((text) => {
          const links = Array.from(document.querySelectorAll('a'));
          const match = links.find(el => el.textContent?.trim() === text);
          if (match) (match as HTMLElement).click();
        }, moduleExportLinkText);
      }

      // 4️⃣ Download
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        this.Export.click()
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();
      console.log(`📥 Downloaded file for ${moduleExportLinkText}:`, fileName);

      const content = fs.readFileSync(filePath!, 'utf-8');

      await this.page.goto(`file://${filePath}`);

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

      // 🔥 Debug URL
      console.log('🌐 Failed URL:', this.page.url());

      const screenshot = await this.page.screenshot({ fullPage: true });
      await testInfo.attach(`❌ Failure Screenshot - ${moduleExportLinkText}`, {
        body: screenshot,
        contentType: 'image/png'
      });

      throw error;
    }
  }
}