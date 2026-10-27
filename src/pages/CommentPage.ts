import { Page, Locator } from '@playwright/test';

export class CommentPage {
  readonly page: Page;

  // List page — Create button
  readonly createCommentBtn: Locator;

  // List page — Search filters
  readonly searchSubjectInput: Locator;
  readonly searchRefInput: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Comment Information (name attrs unconfirmed — UNION locators, ContactPage-style)
  readonly subject: Locator;
  readonly commentsText: Locator;
  readonly commentBy: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createCommentBtn = page.getByRole('button', { name: 'Create Comment' });
    this.searchSubjectInput = page.getByPlaceholder('Subject');
    // Ref presence on the list filter row is unconfirmed — defined for parity only,
    // never used by searchComments/findComment (subject-only search).
    this.searchRefInput = page.getByPlaceholder('Ref');
    this.searchBtn = page.getByRole('button', { name: 'Search' });
    this.selectActions = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Comment Information — UNION locators with .first() for resilience
    // Subject input, Comments textarea, Comment-by select. Ref is AUTO GENERATED — never fill.
    // Comment-by defaults to Sonam Burbure (only changed in bulk edit).
    // Label-anchored: union name attrs are guesses and matched nothing on the live form
    this.subject = this.fieldByLabel('Subject');
    this.commentsText = this.commentsTextareaByLabel();
    this.commentBy = page.locator("select[name='assign_to'], select[name='comment_by']").first();

    // Buttons
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/comments/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/comments`);
    try {
      await this.createCommentBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createCommentBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickCreate() {
    await this.createCommentBtn.waitFor({ state: 'visible' });
    await this.createCommentBtn.click();
  }

  // Input sitting right after a field label (immune to input name attrs) —
  // ContactPage-style fallback, e.g. fieldByLabel('Subject').
  // Unions above are primary; use this only if union names prove risky.
  private fieldByLabel(label: string): Locator {
    return this.page.locator(`xpath=//*[normalize-space(text())='${label}']/following::input[1]`);
  }

  // Textarea variant for the Comments label. The required asterisk may render as
  // 'Comments*', so match with starts-with instead of exact text.
  // Unions above are primary; use this only if union names prove risky.
  private commentsTextareaByLabel(): Locator {
    return this.page.locator(`xpath=//*[starts-with(normalize-space(text()),'Comments')]/following::textarea[1]`);
  }

  // Selects the first <option> whose text matches, e.g. /^Sonam Burbure$/ matches 'Sonam Burbure'
  async selectOptionByText(select: Locator, text: RegExp): Promise<string> {
    const labels = (await select.locator('option').allInnerTexts()).map(t => t.trim());
    const label = labels.find(t => text.test(t));
    if (!label) throw new Error(`No option matching ${text} — available: ${labels.join(', ')}`);
    await select.selectOption({ label });
    return label;
  }

  async fillForm(data: {
    subject: string;
    comments?: string;
  }) {
    await this.subject.waitFor({ state: 'visible' });
    await this.subject.fill(data.subject);

    if (data.comments) await this.commentsText.fill(data.comments);
    // commentBy left as default Sonam Burbure (only used in bulk)
    // Ref is AUTO GENERATED — never fill
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  // Save, then either land on detail or catch the "Related Record" validation popup.
  // Absence of a popup is NOT an error — only a visible popup blocks.
  // Returns the popup message when blocked — X-clicked shut so the run can continue.
  async saveAndWaitForResult(): Promise<{ saved: boolean; message?: string; screenshot?: any }> {
    await this.save();
    const blockedMsg = this.page.getByText(/Please provide Related Record/i).first();
    const blocked = await blockedMsg.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!blocked) {
      await this.waitForDetailPage();
      return { saved: true };
    }
    const shotPath = `test-results/related-record-error-${Date.now()}.png`;
    const shot = await this.page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
    const message = ((await blockedMsg.innerText().catch(() => '')) || 'Related Record required').trim();
    console.log(`Validation popup screenshot: ${shotPath} — message: "${message}"`);
    const dialogBtn = blockedMsg.locator('xpath=ancestor::*[descendant::button][1]/descendant::button[1]');
    await dialogBtn.click().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    return { saved: false, message, screenshot: shot ?? undefined };
  }

  // Subject-only search — Ref filter intentionally unused (presence unconfirmed)
  async searchComments(filters: { subject?: string }) {
    if (filters.subject) await this.searchSubjectInput.fill(filters.subject);
    await this.searchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async createComment(data: Parameters<CommentPage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    const result = await this.saveAndWaitForResult();
    if (!result.saved) {
      const err: any = new Error(`Save blocked by app validation: ${result.message}`);
      err.screenshot = result.screenshot;
      throw err;
    }
  }

  // -- Row actions (list page) -----------------------------
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye)
  // Rows match by unique subject only — NEVER any other column
  rowByName(subject: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: subject }).first();
  }

  private rowActionIcon(subject: string, index: number): Locator {
    return this.rowByName(subject).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(subject: string) {
    await this.rowActionIcon(subject, 0).click();
    await this.subject.waitFor({ state: 'visible' });
  }

  async clickDuplicate(subject: string) {
    await this.rowActionIcon(subject, 1).click();
    await this.subject.waitFor({ state: 'visible' });
  }

  async clickView(subject: string) {
    await this.rowActionIcon(subject, 2).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the comment detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/comments\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.subject.waitFor({ state: 'visible' });
  }

  async findComment(subject: string) {
    await this.navigateToList();
    await this.searchComments({ subject });
    await this.rowByName(subject).waitFor({ state: 'visible', timeout: 15000 });
  }

  // -- Bulk edit (list page) -------------------------------
  rowCheckbox(row: Locator): Locator {
    return row.locator('td').first().locator('input[type="checkbox"]');
  }

  // Works whether 'Select Actions' is a native <select> or a custom dropdown
  async chooseBulkAction(action: RegExp) {
    const tag = await this.selectActions.evaluate(el => el.tagName.toLowerCase());
    const nativeSelect = tag === 'select' ? this.selectActions
      : tag === 'option' ? this.selectActions.locator('xpath=..') : null;
    if (nativeSelect) {
      const label = await nativeSelect.locator('option').filter({ hasText: action }).first().innerText();
      await nativeSelect.selectOption({ label: label.trim() });
    } else {
      await this.selectActions.click();
      await this.page.getByText(action).first().click();
    }
  }

  async clearSearch() {
    await this.clearSearchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}