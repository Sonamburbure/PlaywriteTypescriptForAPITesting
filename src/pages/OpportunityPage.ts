import { Page, Locator, ElementHandle, expect } from '@playwright/test';

export class OpportunityPage {
  readonly page: Page;

  // List page — Create button
  readonly createOpportunityBtn: Locator;

  // List page — Search filters
  readonly searchNameInput: Locator;
  readonly searchRefInput: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Opportunity Information (name attrs UNCONFIRMED — UNION locators + label-anchored)
  readonly opportunityName: Locator;
  readonly closeDate: Locator;
  readonly opportunityType: Locator;
  readonly salesStage: Locator;
  readonly leadSource: Locator;
  readonly paymentTerms: Locator;
  readonly setupRequired: Locator;
  readonly assignedTo: Locator;

  // Detailed Quote tab (bottom section of the add-edit form)
  readonly detailedQuoteTab: Locator;
  readonly addItemBtn: Locator;
  readonly addGroupBtn: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createOpportunityBtn = page.getByRole('button', { name: 'Create Opportunity' });
    this.searchNameInput = page.getByPlaceholder('Opportunity Name');
    // Ref presence on the list filter row is unconfirmed — defined for parity only,
    // never used by searchOpportunities/findOpportunity (name-only search).
    this.searchRefInput = page.getByPlaceholder('Ref');
    this.searchBtn = page.getByRole('button', { name: 'Search' });
    this.selectActions = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Opportunity Information — label-anchored text inputs (immune to input name attrs).
    // API keys (tests/Opportunity.api.spec.ts): opportunity_name (required), close_date,
    // sales_stage, opportunity_type, set_up_required, lead_source,
    // opportunity_payment_terms, assign_to. Ref is AUTO GENERATED — never fill.
    this.opportunityName = this.fieldByLabel('Opportunity Name');
    this.closeDate = this.fieldByLabel('Close Date');

    // Dropdowns — `name` attrs UNCONFIRMED. UNION over candidate names + .first()
    // for resilience; if unmatched at runtime the thrown error names the field.
    this.opportunityType = page
      .locator("select[name='opportunity_type'], select[name='opportunitytype'], select[name='type']")
      .first();
    this.salesStage = page
      .locator("select[name='sales_stage'], select[name='salesstage'], select[name='stage']")
      .first();
    this.leadSource = page
      .locator("select[name='lead_source'], select[name='leadsource'], select[name='source']")
      .first();
    this.paymentTerms = page
      .locator("select[name='opportunity_payment_terms'], select[name='payment_terms'], select[name='paymentterms']")
      .first();
    this.setupRequired = page
      .locator("select[name='set_up_required'], select[name='setup_required'], select[name='setuprequired']")
      .first();
    // assign_to left as default Sonam Burbure (only changed in bulk edit)
    this.assignedTo = page.locator("select[name='assign_to']").first();

    // Detailed Quote — primary: exact-text match (role tab/button varies by build)
    this.detailedQuoteTab = page.getByText('Detailed Quote', { exact: true }).first();
    this.addItemBtn = page.getByRole('button', { name: 'Add Item' });
    // Defined for parity — unused by the spec chain
    this.addGroupBtn = page.getByRole('button', { name: 'Add Group' });

    // Buttons (bottom Save persists both the top form and the quote grid)
    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/opportunities/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/opportunities`);
    try {
      await this.createOpportunityBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createOpportunityBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickCreate() {
    await this.createOpportunityBtn.waitFor({ state: 'visible' });
    await this.createOpportunityBtn.click();
    // Form route carries the -op suffix: #/home/opportunities/add-edit-op
    await this.opportunityName.waitFor({ state: 'visible' });
  }

  // Input sitting right after a field label (immune to input name attrs).
  private fieldByLabel(label: string): Locator {
    return this.page.locator(`xpath=//*[normalize-space(text())='${label}' and not(.//button)]/following::input[1]`);
  }

  // Selects the first <option> whose text matches, e.g. /^Sonam Burbure$/ matches 'Sonam Burbure'
  async selectOptionByText(select: Locator, text: RegExp): Promise<string> {
    const labels = (await select.locator('option').allInnerTexts()).map(t => t.trim());
    const label = labels.find(t => text.test(t));
    if (!label) throw new Error(`No option matching ${text} — available: ${labels.join(', ')}`);
    await select.selectOption({ label });
    return label;
  }

  // Picks a random real option (skips the Select placeholder) and returns its label
  async selectRandomOption(select: Locator): Promise<string> {
    await select.waitFor({ state: 'visible' });
    const labels = (await select.locator('option').allInnerTexts())
      .map(t => t.trim())
      .filter(t => t && t !== 'Select');
    if (!labels.length) throw new Error('No selectable options found');
    const label = labels[Math.floor(Math.random() * labels.length)];
    await select.selectOption({ label });
    return label;
  }

  async fillForm(data: {
    name: string;
    closeDate?: string;
    randomizeDropdowns?: boolean;
  }) {
    await this.opportunityName.waitFor({ state: 'visible' });
    await this.opportunityName.fill(data.name);

    // Close date is a date input — caller wraps in try/catch, leaves blank if picker blocks it
    if (data.closeDate) await this.closeDate.fill(data.closeDate);

    if (data.randomizeDropdowns) {
      // Each select is best-effort: never fail the create if one is missing on this build
      for (const sel of [this.opportunityType, this.salesStage, this.leadSource, this.paymentTerms, this.setupRequired]) {
        try {
          await this.selectRandomOption(sel);
        } catch {
          // leave default — error names the field at runtime if ever asserted
        }
      }
    }
    // assignTo left as default Sonam Burbure (only used in bulk)
    // Venue lookup SKIPPED (lookup, not needed). Address + financials left as-is.
  }

  // Account / Contact lookup — click the field's search icon, popup opens,
  // pick a random record. Never throws: returns '' when unavailable (best-effort).
  private async clickFieldSearchIcon(label: string): Promise<boolean> {
    const input = this.page.locator(
      `xpath=//*[normalize-space(text())='${label}' and not(.//button)]/following::input[1]`
    ).first();
    try {
      await input.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      return false;
    }
    const handle = await input.evaluateHandle((el) => {
      let node = (el as HTMLElement).parentElement;
      for (let d = 0; d < 5 && node; d++) {
        const cand = node.querySelector(
          'button, [role="button"], [id*="btn-search" i], [id*="btnSearch"], [class*="search-icon" i], svg'
        ) as HTMLElement | null;
        if (cand && cand !== el && !cand.contains(el)) return cand;
        node = node.parentElement;
      }
      return null;
    }).catch(() => null);
    const target = handle ? handle.asElement() : null;
    if (!target) return false;
    try {
      await (target as ElementHandle<HTMLElement>).click({ timeout: 8000 });
      return true;
    } catch {
      return false;
    }
  }

  // Select a random Account/Contact record via its lookup popup. Returns the
  // picked record text, or '' when skipped. Never throws.
  async selectLookupRecord(label: string): Promise<string> {
    try {
      if (!(await this.clickFieldSearchIcon(label))) {
        console.log(`${label} lookup skipped — search icon not found`);
        return '';
      }
      const { picked, record } = await this.pickRandomLookupRecord();
      if (!picked) return '';
      console.log(`${label} lookup selected: ${record}`);
      return record;
    } catch (err) {
      console.log(`${label} lookup skipped: ${(err as Error).message.split('\n')[0]}`);
      return '';
    }
  }

  // Close Date — click the calendar icon, pick a random day from the popup.
  // Falls back to filling the given value when the picker is unavailable.
  // Returns the date string actually in the field afterwards.
  async selectRandomCloseDate(fallbackValue: string): Promise<string> {
    try {
      const opener = this.closeDate.locator(
        'xpath=following::*[self::button or (self::span and .//*)][1]'
      ).first();
      if (await opener.isVisible().catch(() => false)) {
        await opener.click();
      } else {
        await this.closeDate.click();
      }
      // This app's calendar is custom: a "Month YYYY" title with plain day numbers.
      // Anchor on the title, climb to the popup root, click a random day 1-28.
      // Month and year render in separate nodes — match the month name alone.
      const titleLoc = this.page.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December)$/).first();
      const titleEl = await titleLoc.elementHandle();
      if (!titleEl) throw new Error('Calendar title not found');
      const dayLabel = await titleEl.evaluate((titleNode) => {
        let root: HTMLElement | null = titleNode as HTMLElement;
        let par = root.parentElement;
        while (par && par.parentElement && par.parentElement.tagName !== 'BODY') {
          root = par;
          par = root.parentElement;
        }
        const els = Array.from(root.querySelectorAll('button, td, a, div, span, li')) as HTMLElement[];
        const days = els.filter((e) => {
          if (!/^(?:[1-9]|[12][0-8])$/.test((e.textContent || '').trim())) return false;
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          const s = getComputedStyle(e);
          return s.display !== 'none' && s.visibility !== 'hidden';
        });
        const deepest = days.filter((e) => !days.some((o) => o !== e && e.contains(o)));
        const pool = deepest.length ? deepest : days;
        if (!pool.length) return null;
        const el = pool[Math.floor(Math.random() * pool.length)];
        el.scrollIntoView({ block: 'nearest' });
        el.click();
        return (el.textContent || '').trim();
      });
      if (!dayLabel) throw new Error('No selectable day found in calendar');
      await this.page.waitForTimeout(500);
      const value = await this.closeDate.inputValue().catch(() => '');
      console.log(`Close date picked — day "${dayLabel}" → "${value}"`);
      if (value) return value;
    } catch (err) {
      console.log(`Close date picker skipped: ${(err as Error).message.split('\n')[0]}`);
    }
    await this.closeDate.fill(fallbackValue).catch(() => {});
    return fallbackValue;
  }


  // -- Detailed Quote (bottom section) ---------------------
  async clickDetailedQuoteTab() {
    await this.detailedQuoteTab.scrollIntoViewIfNeeded();
    await this.detailedQuoteTab.click();
    await this.addItemBtn.waitFor({ state: 'visible' });
  }

  async clickAddItem() {
    await this.addItemBtn.scrollIntoViewIfNeeded();
    await this.addItemBtn.click();
  }

  // Quote grid sits BELOW the Account/Contact fields — click the LAST visible
  // lookup icon so we never re-open the Account popup (#btn-search .first()
  // hits Account's icon). Returns false when none is visible (graceful skip).
  async clickItemSearchIcon(): Promise<boolean> {
    const icons = this.page.locator('#btn-search, [id*="btn-search"], [class*="search-icon"]');
    const count = await icons.count().catch(() => 0);
    let target: Locator | null = null;
    for (let i = count - 1; i >= 0; i--) {
      const ic = icons.nth(i);
      if (await ic.isVisible().catch(() => false)) { target = ic; break; }
    }
    if (!target) {
      console.log('Quote item lookup skipped — search icon not found');
      return false;
    }
    try {
      await target.click({ timeout: 8000 });
      return true;
    } catch {
      console.log('Quote item lookup skipped — search icon not clickable');
      return false;
    }
  }

  // Lookup popup — anchor on the "Min N Characters" search box (8s), else
  // focused/last input; portal-root climb; targeted rows then broad fallback
  // capped at 250; strict plain-text row filter. Escape + skip when empty.
  async pickRandomLookupRecord(): Promise<{ picked: boolean; record: string }> {
    const skip = (msg: string) => {
      console.log(msg);
      return { picked: false, record: '' };
    };
    await this.page.waitForTimeout(1500);
    let popupEl: ElementHandle<HTMLElement> | null = null;
    try {
      const byPlaceholder = this.page.getByPlaceholder(/Min \d+ Characters/i).first();
      await byPlaceholder.waitFor({ state: 'visible', timeout: 8000 });
      popupEl = await byPlaceholder.elementHandle();
    } catch {
      // fall through to DOM fallbacks below
    }
    if (!popupEl) {
      const popupHandle = await this.page.evaluateHandle(() => {
        const ae = document.activeElement as HTMLElement | null;
        if (ae && ae.tagName === 'INPUT') return ae;
        const all = Array.from(document.querySelectorAll('input'));
        const byPh = all.find(i => /min|search/i.test(i.getAttribute('placeholder') || ''));
        if (byPh) return byPh;
        const vis = all.filter(i => i.offsetParent !== null && !i.readOnly && i.type !== 'hidden');
        return vis.length ? vis[vis.length - 1] : null;
      });
    }
    if (!popupEl) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return skip('Quote item lookup skipped — lookup popup did not open');
    }
    // Portal root = topmost element below <body> containing that input
    const rootHandle = await popupEl.evaluateHandle((el) => {
      let node = el as HTMLElement;
      let parent = node.parentElement;
      while (parent && parent.parentElement && parent.parentElement.tagName !== 'BODY') {
        node = parent;
        parent = node.parentElement;
      }
      return node;
    });
    const rootEl = rootHandle.asElement() as ElementHandle<HTMLElement> | null;
    if (!rootEl) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return skip('Quote item lookup skipped — lookup popup did not open');
    }
    const ROW_SELECTOR =
      'li, [role="option"], tbody tr, div[class*="item"], div[class*="record"], div[class*="result"], div[class*="row"]';
    let rowHandles = await rootEl.$$(ROW_SELECTOR);
    for (let attempt = 0; attempt < 4 && !rowHandles.length; attempt++) {
      await this.page.waitForTimeout(1000);
      rowHandles = await rootEl.$$(ROW_SELECTOR);
    }
    if (!rowHandles.length) {
      rowHandles = (await rootEl.$$('div, li, span')).slice(0, 250);
    }
    const readText = async (h: ElementHandle): Promise<string> =>
      ((await h.innerText().catch(() => '')) || '').trim();
    const validIdx: number[] = [];
    for (let i = 0; i < rowHandles.length; i++) {
      const t = await readText(rowHandles[i]);
      // Short plain-text rows only: skip containers, form rows, links and buttons
      if (!t || t.length > 60 || t.includes('Min ')) continue;
      if (/^(Save|Cancel|Select|Product|Item)$/i.test(t)) continue;
      const html = await rowHandles[i].innerHTML().catch(() => '');
      if (/<(input|select|button|textarea|svg|a)\b/i.test(html)) continue;
      validIdx.push(i);
    }
    if (!validIdx.length) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return skip('Quote item lookup skipped — no records found in popup');
    }
    const picked = rowHandles[validIdx[Math.floor(Math.random() * validIdx.length)]];
    const record = await readText(picked);
    await picked.click().catch(() => {});
    await this.page.waitForTimeout(1000);
    // Picking a related record may pop "Please Confirm — copy address from related
    // record?" — Confirm it so the flow continues (no-op when absent). Applies to
    // Account/Contact lookups; harmless for quote items.
    try {
      const confirmHeading = this.page.getByText('Please Confirm', { exact: true });
      await confirmHeading.first().waitFor({ state: 'visible', timeout: 5000 });
      await this.page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
      await confirmHeading.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      console.log('Confirmed address copy from related record');
    } catch {
      // no confirm popup — continue
    }
    return { picked: true, record };
  }

  // Quote grid row holding the picked record text (first tbody match)
  quoteRow(record: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: record }).first();
  }

  // Right-side column inputs within the added item row. Confirmed DOM names:
  // sales_price, cost_price (+ quantity/qty and discount variants). Time measure
  // renders as text ('-') and VAT is a dropdown — neither is a fillable input.
  quoteRowInput(record: string, column: 'sales' | 'cost' | 'qty' | 'discount'): Locator {
    const row = this.quoteRow(record);
    switch (column) {
      case 'sales': return row.locator("input[name='sales_price']").first();
      case 'cost': return row.locator("input[name='cost_price']").first();
      case 'qty': return row.locator("input[name='quantity'], input[name='qty'], input[name='item_quantity']").first();
      case 'discount': return row.locator("input[name='discount'], input[name='discount_amount']").first();
    }
  }

  // Fill right-side columns of the picked row (fixed round numbers in spec).
  // Verifies every value stuck (read-back + retry) — an app that clears or
  // ignores typed input fails loudly here instead of silently saving zeros.
  async fillQuoteRowColumns(
    record: string,
    data: { sales: string; cost: string; qty: string; discount: string },
  ) {
    await this.quoteRow(record).waitFor({ state: 'visible' });
    const entries = [['sales', data.sales], ['cost', data.cost], ['qty', data.qty], ['discount', data.discount]] as const;
    for (const [key, value] of entries) {
      const input = this.quoteRowInput(record, key);
      let actual = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        await input.fill(value).catch(() => {});
        await this.page.waitForTimeout(300);
        actual = await input.inputValue().catch(() => '');
        if (actual === value) break;
      }
      if (actual !== value) throw new Error(`Quote ${key} did not take value (want "${value}", got "${actual}")`);
      console.log(`Quote ${key} set to "${value}"`);
    }
  }
  // VAT is a dropdown in the row — pick the last rate option when parseable;
  // returns the VAT label used and the expected row Total for subtotal.
  async setQuoteVatAndExpected(record: string, subtotal: number): Promise<{ vatLabel: string; expectedTotal: string }> {
    let vatRate = 0;
    let vatLabel = '0 (default)';
    try {
      const vatSelect = this.quoteRow(record).locator('td').nth(7).locator('select');
      if ((await vatSelect.count()) > 0) {
        const labels = (await vatSelect.locator('option').allInnerTexts()).map(t => t.trim()).filter(t => t !== '' && !/^select$/i.test(t) && t !== '0');
        if (labels.length) {
          vatLabel = labels[labels.length - 1];
        const m = vatLabel.replace(",", ".").match(/[\d.]+/);
          if (m) {
            const num = parseFloat(m[0]);
            vatRate = num > 1 ? num / 100 : num;
            await vatSelect.selectOption({ label: vatLabel });
          }
        }
      }
    } catch {
      // keep default VAT
    }
    const expectedTotal = (Math.round(subtotal * (1 + vatRate) * 100) / 100).toFixed(2);
    console.log(`Quote VAT: "${vatLabel}" → expected row Total ${expectedTotal} for subtotal ${subtotal.toFixed(2)}`);
    return { vatLabel, expectedTotal };
  }

  // Row-level Save button (persists the quote line before the bottom Save)
  // Row-level Save button (persists the quote line before the bottom Save).
  // Waits for the saved-row state (edit icon) so a silent no-save fails loudly.
  async saveQuoteRow(record: string) {
    await this.quoteRow(record).getByRole('button', { name: 'Save', exact: true }).click();
    await this.quoteRowIcons(record).edit.waitFor({ state: 'visible', timeout: 15000 });
    console.log(`Quote row saved for "${record}"`);
  }

  // Assert computed Subtotal (td 6) and Total (td 8) cells of the saved row
  async verifyQuoteTotals(record: string, expectedSubtotal: string, expectedTotal: string) {
    const row = this.quoteRow(record);
    await expect.soft(row.locator('td').nth(6), 'Quote: Subtotal should equal sales x qty').toContainText(expectedSubtotal, { timeout: 10000 });
    await expect.soft(row.locator('td').nth(8), `Quote: Total should equal subtotal + VAT (${expectedTotal})`).toContainText(expectedTotal, { timeout: 10000 });
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  // Save, then either land on detail or catch the validation popup.
  // Absence of a popup is NOT an error — only a visible popup blocks.
  // Returns the popup message when blocked — X-clicked shut so the run can continue.
  async saveAndWaitForResult(): Promise<{ saved: boolean; message?: string; screenshot?: any }> {
    await this.save();
    const blockedMsg = this.page.getByText(/Please (provide|select|enter|fill)|is required|is mandatory|field is required/i).first();
    const blocked = await blockedMsg.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!blocked) {
      await this.waitForDetailPage();
      return { saved: true };
    }
    const shotPath = `test-results/opportunity-${Date.now()}.png`;
    const shot = await this.page.screenshot({ path: shotPath, fullPage: true }).catch(() => null);
    const message = ((await blockedMsg.innerText().catch(() => '')) || 'Opportunity validation blocked save').trim();
    console.log(`Validation popup screenshot: ${shotPath} — message: "${message}"`);
    const dialogBtn = blockedMsg.locator('xpath=ancestor::*[descendant::button][1]/descendant::button[1]');
    await dialogBtn.click().catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    return { saved: false, message, screenshot: shot ?? undefined };
  }

  // Name-only search — Ref filter intentionally unused (presence unconfirmed)
  async searchOpportunities(filters: { name?: string }) {
    if (filters.name) await this.searchNameInput.fill(filters.name);
    await this.searchBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async createOpportunity(data: Parameters<OpportunityPage['fillForm']>[0]) {
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
  // Rows match by unique opportunity name only — NEVER any other column
  rowByName(name: string): Locator {
    return this.page.locator('tbody tr').filter({ hasText: name }).first();
  }

  private rowActionIcon(name: string, index: number): Locator {
    return this.rowByName(name).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(name: string) {
    await this.rowActionIcon(name, 0).click();
    await this.opportunityName.waitFor({ state: 'visible' });
  }

  async clickDuplicate(name: string) {
    await this.rowActionIcon(name, 1).click();
    await this.opportunityName.waitFor({ state: 'visible' });
  }

  async clickView(name: string) {
    await this.rowActionIcon(name, 2).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the opportunity detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we've already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/opportunities\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.opportunityName.waitFor({ state: 'visible' });
  }

  async findOpportunity(name: string) {
    await this.navigateToList();
    await this.searchOpportunities({ name });
    await this.rowByName(name).waitFor({ state: 'visible', timeout: 15000 });
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

  // After bulk save the app shows an "Updating..." progress popup — wait until
  // it appears and then disappears so the run never races ahead of the server.
  async waitForBulkComplete(timeout = 60000) {
    const updating = this.page.getByText(/Updating\.\.\./i).first();
    try {
      await updating.waitFor({ state: 'visible', timeout: 8000 });
      await updating.waitFor({ state: 'hidden', timeout });
      console.log('Bulk progress completed — "Updating..." popup closed');
    } catch {
      console.log('Bulk progress settled (popup absent or already closed)');
    }
  }
}