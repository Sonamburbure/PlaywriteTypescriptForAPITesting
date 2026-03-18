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

      // 🔥 Extra wait to stabilize page (headless)
      await this.page.waitForTimeout(3000);

      // 2️⃣ Select Actions button (robust locator using ID & classes)
      const selectActionButton = this.page.locator('button#dropdown-basic3.btn-more.dropdown-toggle.btn.btn-primary');

      // Wait for button to be visible
      await selectActionButton.waitFor({ state: 'visible', timeout: 120000 });

      // Scroll into view
      await selectActionButton.scrollIntoViewIfNeeded();

      // Ensure visibility
      await expect(selectActionButton).toBeVisible({ timeout: 30000 });

      // Click with JS fallback
      try {
        await selectActionButton.click({ timeout: 60000 });
      } catch (e) {
        console.log('⚠️ Normal click failed, using JS click for Select Actions');
        await this.page.evaluate(() => {
          const btn = document.querySelector('button#dropdown-basic3.btn-more.dropdown-toggle.btn.btn-primary') as HTMLElement;
          if (btn) btn.click();
        });
      }

      // Small wait for dropdown
      await this.page.waitForTimeout(1000);

      // 3️⃣ Export link
      const exportModuleLocator = this.page.locator(`(//a[normalize-space()='${moduleExportLinkText}'])[1]`);

      await exportModuleLocator.waitFor({ state: 'attached', timeout: 30000 });
      await expect(exportModuleLocator).toBeVisible({ timeout: 30000 });

      try {
        await exportModuleLocator.click({ timeout: 60000 });
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

      // Debug URL
      console.log('🌐 Failed URL:', this.page.url());

      // Screenshot fallback
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        await testInfo.attach(`❌ Failure Screenshot - ${moduleExportLinkText}`, {
          body: screenshot,
          contentType: 'image/png'
        });
      } catch {
        console.warn('⚠️ Could not capture screenshot, page might be closed');
      }

      throw error;
    }
  }
}