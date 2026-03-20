import { Page, TestInfo } from '@playwright/test';

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Stable Select Actions click
  private async clickSelectActions(expectedText: string) {
    const btn = this.page.getByRole('button', { name: /select/i });

    // Wait for page network to be idle
    await this.page.waitForLoadState('networkidle');

    await this.page.screenshot({ path: 'before-click.png', fullPage: true });

    await btn.waitFor({ state: 'visible', timeout: 60000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    console.log("✅ Clicked Select Actions");

    // Small pause to ensure dropdown content is rendered
    await this.page.waitForTimeout(500);

    // Debug: print all links in dropdown to verify text
    const allLinks = await this.page.locator('a').allTextContents();
    console.log('🔍 Dropdown links:', allLinks);

    // Use getByText instead of XPath for more reliable matching
    const exportOption = this.page.getByText(expectedText.trim(), { exact: false });
    await exportOption.waitFor({ state: 'visible', timeout: 60000 });
    await exportOption.scrollIntoViewIfNeeded();
    await exportOption.click({ force: true });

    console.log("✅ Dropdown export option clicked");
  }

  async exportModuleByUrl(
    testInfo: TestInfo,
    moduleUrl: string,
    moduleExportLinkText: string
  ) {
    try {
      console.log(`🚀 Navigating to: ${moduleUrl}`);

      await this.page.goto(moduleUrl);

      // Wait until page and network is fully loaded
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForLoadState('networkidle');

      console.log('🌐 Current URL:', this.page.url());

      // Optional: check page title safely
      try {
        console.log('📄 Page title:', await this.page.title());
      } catch {
        console.log("⚠️ Page title not available");
      }

      if (this.page.url().includes('login')) {
        throw new Error("❌ Not logged in → redirected to login page");
      }

      await this.page.waitForSelector('body', { timeout: 60000 });
      await this.page.screenshot({ path: 'page-loaded.png', fullPage: true });

      // Check Select button
      const btn = this.page.getByRole('button', { name: /select/i });
      const btnCount = await btn.count();
      console.log("🔍 Select Actions button count:", btnCount);

      if (btnCount === 0) throw new Error("❌ Select Actions button not found");

      // Click Select Actions with wait
      await this.clickSelectActions(moduleExportLinkText);

      // Wait for network idle after dropdown opens
      await this.page.waitForLoadState('networkidle');

      // Handle download button
      const exportButton = this.page.getByRole('button', { name: /export/i }).first();
      await exportButton.waitFor({ state: 'visible', timeout: 60000 });

      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        exportButton.click()
      ]);

      console.log(`📥 Downloaded: ${download.suggestedFilename()}`);

    } catch (error) {
      console.error(`❌ Export failed for ${moduleExportLinkText}:`, error);

      try { console.log("🌐 Final URL:", this.page.url()); } catch {}
      try { console.log("📄 Final title:", await this.page.title()); } catch {}
      try {
        await this.page.screenshot({ path: `error-${Date.now()}.png`, fullPage: true });
      } catch {}

      throw error;
    }
  }
}