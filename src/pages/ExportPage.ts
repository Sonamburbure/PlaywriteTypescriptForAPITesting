import { Page, TestInfo } from '@playwright/test';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ✅ Stable Select Actions click
  private async clickSelectActions(expectedText: string) {
    const btn = this.page.getByRole('button', { name: /select/i });

    await this.page.waitForLoadState('networkidle');

    await this.page.screenshot({ path: 'before-click.png', fullPage: true });

    await btn.waitFor({ state: 'visible', timeout: 60000 });

    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    console.log("✅ Clicked Select Actions");

    await this.page.waitForTimeout(2000);

    await this.page.waitForSelector(
      `//a[normalize-space()='${expectedText}']`,
      { state: 'visible', timeout: 60000 }
    );

    console.log("✅ Dropdown opened successfully");
  }

  async exportModuleByUrl(
    testInfo: TestInfo,
    moduleUrl: string,
    moduleExportLinkText: string
  ) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      await this.page.goto(moduleUrl);

      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForLoadState('networkidle');

      console.log('🌐 Current URL:', this.page.url());

      // ✅ SAFE TITLE (no crash)
      try {
        console.log('📄 Page title:', await this.page.title());
      } catch {
        console.log("⚠️ Page title not available");
      }

      // ✅ LOGIN CHECK
      if (this.page.url().includes('login')) {
        throw new Error("❌ Not logged in → redirected to login page");
      }

      await this.page.waitForSelector('body', { timeout: 60000 });

      await this.page.screenshot({
        path: 'page-loaded.png',
        fullPage: true
      });

      // ✅ Check Select button
      const btn = this.page.getByRole('button', { name: /select/i });
      const btnCount = await btn.count();

      console.log("🔍 Select Actions button count:", btnCount);

      if (btnCount === 0) {
        throw new Error("❌ Select Actions button not found");
      }

      // ✅ Click Select Actions
      await this.clickSelectActions(moduleExportLinkText);

      // ✅ DEBUG before clicking export
      await this.page.screenshot({
        path: 'before-export.png',
        fullPage: true
      });

      const exportOption = this.page.locator(
        `//a[normalize-space()='${moduleExportLinkText}']`
      );

      const exportCount = await exportOption.count();
      console.log("🔍 Export option count:", exportCount);

      if (exportCount === 0) {
        throw new Error(`❌ ${moduleExportLinkText} not found in dropdown`);
      }

      await exportOption.waitFor({ state: 'visible', timeout: 60000 });
      await exportOption.scrollIntoViewIfNeeded();
      await exportOption.click({ force: true });

      console.log(`✅ Clicked ${moduleExportLinkText}`);

      // ✅ Download handling
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        this.page.locator("(//button[normalize-space()='Export'])[1]").click()
      ]);

      console.log(`📥 Downloaded: ${download.suggestedFilename()}`);

    } catch (error) {
      console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);

      // ✅ SAFE LOGS (no crash if page closed)
      try {
        console.log("🌐 Final URL:", this.page.url());
      } catch {
        console.log("⚠️ Page closed (URL not available)");
      }

      try {
        const title = await this.page.title();
        console.log("📄 Final title:", title);
      } catch {
        console.log("⚠️ Page closed (title not available)");
      }

      // ✅ SAFE SCREENSHOT
      try {
        await this.page.screenshot({
          path: `error-${Date.now()}.png`,
          fullPage: true
        });
      } catch {
        console.log("⚠️ Cannot capture screenshot (page closed)");
      }

      throw error;
    }
  }
}