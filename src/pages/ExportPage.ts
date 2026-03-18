import { Page, expect, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;
  readonly exportButton: any;

  constructor(page: Page) {
    this.page = page;
    this.exportButton = page.locator("(//button[normalize-space()='Export'])[1]");
  }

  async exportModuleByUrl(testInfo: TestInfo, moduleUrl: string, moduleExportLinkText: string) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      // 1️⃣ Navigate with network idle wait
      await this.page.goto(moduleUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');

      console.log('🌐 Current URL:', this.page.url());

      // Extra wait to mimic Selenium Thread.sleep
      await this.page.waitForTimeout(3000);

      // 2️⃣ Select Actions button
      const selectActionButton = this.page.locator("(//button[normalize-space()='Select Actions'])[1]");

      // Wait until attached
      await selectActionButton.waitFor({ state: 'attached', timeout: 120000 });

      // Scroll into view
      await selectActionButton.scrollIntoViewIfNeeded();

      // Ensure visible
      await expect(selectActionButton).toBeVisible({ timeout: 60000 });

      // Click with JS fallback
      try {
        await selectActionButton.click({ timeout: 120000 });
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

      // Wait for dropdown
      await this.page.waitForTimeout(1000);

      // 3️⃣ Export option
      const exportLocator = this.page.locator(`(//a[normalize-space()='${moduleExportLinkText}'])[1]`);

      await exportLocator.waitFor({ state: 'attached', timeout: 60000 });
      await exportLocator.scrollIntoViewIfNeeded();
      await expect(exportLocator).toBeVisible({ timeout: 60000 });

      try {
        await exportLocator.click({ timeout: 60000 });
      } catch (e) {
        console.log('⚠️ Normal click failed, using JS click for Export');
        await this.page.evaluate((text) => {
          const links = Array.from(document.querySelectorAll('a'));
          const match = links.find(el => el.textContent?.trim() === text);
          if (match) (match as HTMLElement).click();
        }, moduleExportLinkText);
      }

      // 4️⃣ Handle download
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 120000 }),
        this.exportButton.click({ timeout: 60000 })
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();
      console.log(`📥 Downloaded file for ${moduleExportLinkText}: ${fileName}`);

      // Read content to validate
      const content = fs.readFileSync(filePath!, 'utf-8');

      // 5️⃣ Attach screenshot
      const screenshot = await this.page.screenshot({ fullPage: true });
      await testInfo.attach(`${moduleExportLinkText} Export Screenshot`, {
        body: screenshot,
        contentType: 'image/png'
      });

      // 6️⃣ Attach downloaded file
      await testInfo.attach(`${moduleExportLinkText} Downloaded File`, {
        path: filePath!
      });

      // Validate file type
      if (!fileName.match(/\.xlsx|\.csv/)) {
        console.warn(`⚠️ Export warning: File is not Excel/CSV`);
      } else if (content.includes('Automate Events')) {
        console.warn(`⚠️ Export warning: HTML content instead of file`);
      } else {
        console.log(`✅ Export of ${moduleExportLinkText} successful`);
      }

    } catch (error) {
      console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);

      console.log('🌐 Failed URL:', this.page.url());

      // Attach full-page screenshot on failure
      const screenshot = await this.page.screenshot({ fullPage: true });
      await testInfo.attach(`❌ Failure Screenshot - ${moduleExportLinkText}`, {
        body: screenshot,
        contentType: 'image/png'
      });

      throw error;
    }
  }
}