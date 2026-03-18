import { Page } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;
  readonly Export: any;
 // readonly radiobutton: any;

  constructor(page: Page) {
    this.page = page;
    this.Export = page.locator("(//button[normalize-space()='Export'])[1]"); // common Export button
   // this.radiobutton = page.locator("input[type='radio']").first();
  }

  /**
   * Export a module by URL and module-specific export link text
   */
  async exportModuleByUrl(testInfo: any, moduleUrl: string, moduleExportLinkText: string) {
    try {
      // 1️⃣ Navigate to module page
      await this.page.goto(moduleUrl);

      // 2️⃣ Click Select Actions dynamically
      const selectActionButton = this.page.locator("(//button[normalize-space()='Select Actions'])[1]");
      await selectActionButton.waitFor({ state: 'visible', timeout: 15000 });
      await selectActionButton.click();

      // 3️⃣ Click module-specific Export link
      const exportModuleLocator = this.page.locator(`(//a[normalize-space()='${moduleExportLinkText}'])[1]`);
      await exportModuleLocator.waitFor({ state: 'visible', timeout: 10000 });
      await exportModuleLocator.click();

      // 4️⃣ Select first radio button
      //await this.radiobutton.waitFor({ state: 'visible', timeout: 5000 });
     // await this.radiobutton.check();

      // 5️⃣ Click Export button and wait for download
      const [download] = await Promise.all([
        this.page.waitForEvent('download'),
        this.Export.click()
      ]);

      const filePath = await download.path();
      const fileName = download.suggestedFilename();
      console.log(`Downloaded file for ${moduleExportLinkText}:`, fileName);

      // Read file content
      const content = fs.readFileSync(filePath!, 'utf-8');

      // Open downloaded file in browser
      await this.page.goto(`file://${filePath}`);

      // Take screenshot
      const screenshot = await this.page.screenshot();
      await testInfo.attach(`${moduleExportLinkText} Export Screenshot`, { body: screenshot, contentType: 'image/png' });

      // Attach downloaded file
      await testInfo.attach(`${moduleExportLinkText} Downloaded File`, { path: filePath! });

      // Validate file type and content
      if (!fileName.match(/\.xlsx|\.csv/)) {
        console.warn(`⚠️ Export warning for ${moduleExportLinkText}: File is not Excel/CSV`);
      } else if (content.includes('Automate Events')) {
        console.warn(`⚠️ Export warning for ${moduleExportLinkText}: HTML page downloaded instead of actual file`);
      } else {
        console.log(`✅ Export of ${moduleExportLinkText} successful and file is valid`);
      }

    } catch (error) {
      console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);
    }
  }
}