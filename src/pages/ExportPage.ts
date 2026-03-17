import { Page, Locator } from '@playwright/test';
import fs from 'fs';

export class ExportPage {
  readonly page: Page;
  readonly menuBtn: Locator;
  readonly ThirdParties: Locator;
  readonly Account: Locator;
  readonly SelectAction: Locator;
  readonly ExportAccount: Locator;
  readonly radiobutton: Locator;
  readonly Export: Locator;

  constructor(page: Page) {
    this.page = page;

    this.menuBtn = page.locator("i[role='button']");

    // ✅ XPath locators
    this.ThirdParties = page.locator("(//button[normalize-space()='Third Parties'])[1]");
    this.Account = page.locator("(//a[normalize-space()='Accounts'])[1]");
    this.SelectAction = page.locator("(//button[normalize-space()='Select Actions'])[1]");
    this.ExportAccount = page.locator("(//a[normalize-space()='Export Account'])[1]");
    this.Export = page.locator("(//button[normalize-space()='Export'])[1]");

    // ✅ Stable radio button locator
    this.radiobutton = page.locator("input[type='radio']").first();
  }

  // ✅ Full export flow with validation + reporting
  async exportAccount(testInfo:any) {
    await this.menuBtn.click();
    await this.ThirdParties.click();
    await this.Account.click();
    await this.SelectAction.click();
    await this.ExportAccount.click();
    await this.radiobutton.check();

    // ✅ Capture download
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.Export.click()
    ]);

    const filePath = await download.path();
    const fileName = download.suggestedFilename();

    console.log('Downloaded file:', fileName);

    // ✅ Read file content
    const content = fs.readFileSync(filePath!, 'utf-8');

    // ✅ Open downloaded file in browser (for proof)
    await this.page.goto(`file://${filePath}`);

    // ✅ Take screenshot
    const screenshot = await this.page.screenshot();

    // ✅ Attach screenshot to report
    await testInfo.attach('Export HTML Screenshot', {
      body: screenshot,
      contentType: 'image/png',
    });

    // ✅ Attach downloaded file
    await testInfo.attach('Downloaded File', {
      path: filePath!,
    });

    // ❌ Fail if wrong file type
    if (!fileName.match(/\.xlsx|\.csv/)) {
      throw new Error('❌ Export failed: File is not Excel/CSV');
    }

    // ❌ Fail if HTML content
    if (content.includes('Automate Events')) {
      throw new Error('❌ Export failed: HTML page downloaded instead of actual file');
    }

    console.log('✅ Export successful and file is valid');
  }
}