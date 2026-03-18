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

      // 1️⃣ Navigate
      await this.page.goto(moduleUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForLoadState('networkidle');
      console.log('🌐 Current URL:', this.page.url());

      // 🔥 Extra wait for slow Jenkins environments
      await this.page.waitForTimeout(3000);

      // 2️⃣ Click "Select Actions" using robust JS click
      await this.page.evaluate(async () => {
        return new Promise<void>((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 20000; // 20s
          const interval = setInterval(() => {
            const btn = document.querySelector('button#dropdown-basic3') as HTMLElement;
            if (btn) {
              btn.scrollIntoView({ block: 'center', inline: 'center' });
              btn.click();
              clearInterval(interval);
              resolve();
            } else if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error('Select Actions button not found after 20s'));
            }
          }, 100);
        });
      });

      // Small wait for dropdown to render
      await this.page.waitForTimeout(500);

      // 3️⃣ Click "Export" link using JS click
      await this.page.evaluate((linkText) => {
        return new Promise<void>((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 20000;
          const interval = setInterval(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const target = links.find(el => el.textContent?.trim() === linkText) as HTMLElement;
            if (target) {
              target.scrollIntoView({ block: 'center', inline: 'center' });
              target.click();
              clearInterval(interval);
              resolve();
            } else if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error(`Export link "${linkText}" not found after 20s`));
            }
          }, 100);
        });
      }, moduleExportLinkText);

      // 4️⃣ Download handling
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        this.exportButton.click()
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();
      console.log(`📥 Downloaded file for ${moduleExportLinkText}:`, fileName);

      const content = fs.readFileSync(filePath!, 'utf-8');

      // Attach screenshot of downloaded page
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

      // Safe screenshot in case page/context is closed
      try {
        const screenshot = await this.page.screenshot({ fullPage: true });
        await testInfo.attach(`❌ Failure Screenshot - ${moduleExportLinkText}`, {
          body: screenshot,
          contentType: 'image/png'
        });
      } catch (e) {
        console.warn('⚠️ Failed to capture screenshot:', e);
      }

      throw error;
    }
  }
}