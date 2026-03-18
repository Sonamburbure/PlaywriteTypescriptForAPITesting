// ExportPage.ts
import { Page, expect, TestInfo } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;
  readonly Export: any;

  constructor(page: Page) {
    this.page = page;
    this.Export = page.locator("(//button[normalize-space()='Export'])[1]");
  }

  async exportModuleByUrl(testInfo: TestInfo, moduleUrl: string, moduleExportLinkText: string) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      // 1️⃣ Navigate and wait until network idle
      await this.page.goto(moduleUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');

      console.log('🌐 Current URL:', this.page.url());

      // 🔥 Extra wait for slow Jenkins headless
      await this.page.waitForTimeout(3000);

      // 2️⃣ Select Actions button
      const selectActionButton = this.page.locator("(//button[normalize-space()='Select Actions'])[1]");

      // Wait for element in DOM + visible + scroll into view
      await selectActionButton.waitFor({ state: 'attached', timeout: 120000 });
      await selectActionButton.scrollIntoViewIfNeeded();
      await expect(selectActionButton).toBeVisible({ timeout: 60000 });

      // Click with fallback to JS
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

      // Wait a little for dropdown
      await this.page.waitForTimeout(1000);

      // 3️⃣ Export link
      const exportModuleLocator = this.page.locator(`(//a[normalize-space()='${moduleExportLinkText}'])[1]`);
      await exportModuleLocator.waitFor({ state: 'attached', timeout: 120000 });
      await expect(exportModuleLocator).toBeVisible({ timeout: 60000 });

      try {
        await exportModuleLocator.click({ timeout: 120000 });
      } catch (e) {
        console.log('⚠️ Normal click failed, using JS click for Export option');
        await this.page.evaluate((text) => {
          const links = Array.from(document.querySelectorAll('a'));
          const match = links.find(el => el.textContent?.trim() === text);
          if (match) (match as HTMLElement).click();
        }, moduleExportLinkText);
      }

      // 4️⃣ Wait for download
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 120000 }),
        this.Export.click()
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();
      console.log(`📥 Downloaded file for ${moduleExportLinkText}:`, fileName);

      const content = fs.readFileSync(filePath!, 'utf-8');

      // Screenshot of the file
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

      // Debug URL
      console.log('🌐 Failed URL:', this.page.url());

      // Screenshot fallback
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        await testInfo.attach(`❌ Failure Screenshot - ${moduleExportLinkText}`, {
          body: screenshot,
          contentType: 'image/png'
        });
      } catch (e) {
        console.warn('⚠️ Could not take screenshot on failure:', (e as Error).message);
      }

      throw error;
    }
  }
}