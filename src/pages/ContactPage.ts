import { Page, Locator, ElementHandle } from '@playwright/test';

export class ContactPage {
  readonly page: Page;

  // List page — Create button
  readonly createContactBtn: Locator;

  // List page — Search filters
  readonly searchFirstNameInput: Locator;
  readonly searchSurnameInput: Locator;
  readonly searchJobInput: Locator;
  readonly searchPhoneInput: Locator;
  readonly searchMobileInput: Locator;
  readonly searchBtn: Locator;
  readonly selectActions: Locator;
  readonly clearSearchBtn: Locator;

  // Contact Information
  readonly firstName: Locator;
  readonly surname: Locator;
  readonly jobDescription: Locator;
  readonly phone: Locator;
  readonly primaryEmail: Locator;
  readonly mobile: Locator;
  readonly secondaryEmail: Locator;
  readonly assignedTo: Locator;

  // Address Details
  readonly streetAddress: Locator;
  readonly town: Locator;
  readonly postCode: Locator;
  readonly countySearchInput: Locator;
  readonly country: Locator;

  // Buttons
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  // Detail (view) page
  readonly detailEditBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.createContactBtn   = page.getByRole('button', { name: 'Create Contact' });
    this.searchFirstNameInput = page.getByPlaceholder('First Name');
    this.searchSurnameInput   = page.getByPlaceholder('Surname');
    this.searchJobInput       = page.getByPlaceholder('Job Description');
    this.searchPhoneInput     = page.getByPlaceholder('Phone');
    this.searchMobileInput    = page.getByPlaceholder('Mobile');
    this.searchBtn            = page.getByRole('button', { name: 'Search' });
    this.selectActions        = page.getByText('Select Actions', { exact: true }).first();
    // Cross (X) icon shown next to the Search button once a filter is applied
    this.clearSearchBtn       = this.searchBtn.locator('xpath=following-sibling::*[1]');

    // Contact Information — UNION locators with .first() for resilience
    // Confirmed API names (see tests/Contact.api.spec.ts): firstname, lastname,
    // contact_phone, contact_email. Job/mobile/secondary-email names unconfirmed.
    this.firstName      = page.locator("input[name='firstname']:visible, input[name='contact_firstname']:visible, input[name='first_name']:visible").first();
    this.surname        = page.locator("input[name='lastname']:visible, input[name='contact_lastname']:visible, input[name='last_name']:visible").first();
    this.jobDescription = this.fieldByLabel('Job Description');
    this.phone          = page.locator("input[name='contact_phone']:visible, input[name='phone']:visible").first();
    this.primaryEmail   = page.locator("input[name='contact_email']:visible, input[name='email']:visible").first();
    this.mobile         = this.fieldByLabel('Mobile');
    this.secondaryEmail = this.fieldByLabel('Secondary Email');
    this.assignedTo     = page.locator("select[name='assign_to']");

    // Address Details — confirmed: contact_address, contact_city, contact_post_code, contact_country
    this.streetAddress     = page.locator("textarea[name='contact_address']:visible, textarea[name='address']:visible").first();
    this.town              = page.locator("input[name='contact_city']:visible, input[name='city']:visible, input[name='town']:visible").first();
    this.postCode          = page.locator("input[name='contact_post_code']:visible, input[name='post_code']:visible, input[name='postcode']:visible").first();
    // County — React Select combobox (same pattern as SupplierPage)
    this.countySearchInput = page.locator("input[id^='react-select-'][id$='-input']").first();
    this.country           = page.locator("select[name='contact_country']");

    // Buttons
    this.saveBtn   = page.getByRole('button', { name: 'Save' }).first();
    this.cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();

    // Detail (view) page
    this.detailEditBtn = page.getByRole('button', { name: 'Edit', exact: true });
  }

  // A hash-only goto (e.g. from #/home/contacts/detail/31) can leave the SPA on the old view,
  // so confirm the list rendered and reload if it did not
  async navigateToList() {
    await this.page.goto(`${process.env.BASE_UI_URL}/#/home/contacts`);
    try {
      await this.createContactBtn.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      await this.page.reload();
      await this.createContactBtn.waitFor({ state: 'visible' });
    }
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createContactBtn.waitFor({ state: 'visible' });
    await this.createContactBtn.click();
  }

  // Input sitting right after a field label (immune to input name attrs)
  private fieldByLabel(label: string): Locator {
    return this.page.locator(`xpath=//*[normalize-space(text())='${label}']/following::input[1]`);
  }

  async selectCounty(countyName: string) {
    await this.countySearchInput.click();
    await this.countySearchInput.fill(countyName);
    const option = this.page.locator('[role="option"]').filter({ hasText: countyName }).first();
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  // Selects the first <option> whose text matches, e.g. /^Sonam Burbure$/ matches exactly that assignee
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

  // Related To — no readonly relatedToSelect locator by name attr (unconfirmed),
  // so find the module select by its options instead of a brittle name-based locator
  async findRelatedToSelect(): Promise<Locator> {
    const selects = this.page.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i);
      const texts = (await sel.locator('option').allInnerTexts()).map(t => t.trim());
      if (texts.includes('Account') && texts.includes('Venue') && texts.includes('Supplier')) {
        return sel;
      }
    }
    throw new Error('Related-To module select not found');
  }

  // Related To is optional (no required asterisk): random module, magnifier
  // click on span#btn-search, random record from the popup.
  // Skips gracefully with empty record whenever the popup/pick is unavailable.
  async selectRelatedTo(): Promise<{ module: string; record: string }> {
    const sel = await this.findRelatedToSelect();
    const module = await this.selectRandomOption(sel);
    // Recorded DOM: the magnifier is span#btn-search inside the Related-To lookup
    const magnifier = this.page.locator('#btn-search').first();
    try {
      await magnifier.waitFor({ state: 'visible', timeout: 15000 });
      await magnifier.click();
    } catch {
      console.log('Related To skipped — search icon not found');
      return { module, record: '' };
    }
    await this.page.waitForTimeout(1500);
    // Popup search box confirmed on screen ("Min 4 Characters") — try it first,
    // then focused input / Min-Search placeholder / last visible input
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
      popupEl = popupHandle.asElement() as ElementHandle<HTMLElement> | null;
    }
    if (!popupEl) {
      await this.page.keyboard.press('Escape').catch(() => {});
      console.log('Related To skipped — lookup popup did not open');
      return { module, record: '' };
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
      console.log('Related To skipped — lookup popup did not open');
      return { module, record: '' };
    }
    // Candidate result rows inside the popup — poll while they load, then fall
    // back to every plain-text block; strict filters below keep clicks safe
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
    const collectValid = async (): Promise<number[]> => {
      const idx: number[] = [];
      for (let i = 0; i < rowHandles.length; i++) {
        const t = await readText(rowHandles[i]);
        // Short plain-text rows only: skip containers, form rows, links and buttons
        if (!t || t.length > 60 || t === module || t.includes('Min ')) continue;
        if (/^(Save|Cancel|Select|Account|Venue|Supplier)$/i.test(t)) continue;
        const html = await rowHandles[i].innerHTML().catch(() => '');
        if (/<(input|select|button|textarea|svg|a)\b/i.test(html)) continue;
        idx.push(i);
      }
      return idx;
    };
    // Rows preload with an empty search — pick straight from the popup, no typing
    const validIdx = await collectValid();
    if (!validIdx.length) {
      await this.page.keyboard.press('Escape').catch(() => {});
      console.log(`Related To skipped — no ${module} records found`);
      return { module, record: '' };
    }
    const picked = rowHandles[validIdx[Math.floor(Math.random() * validIdx.length)]];
    const record = await readText(picked);
    await picked.click().catch(() => {});
    await this.page.waitForTimeout(1000);
    return { module, record };
  }

  // Salutation select sits immediately before the First Name input
  async selectSalutation(): Promise<string> {
    const salutation = this.firstName.locator('xpath=preceding::select[1]');
    await salutation.waitFor({ state: 'visible' });
    const labels = (await salutation.locator('option').allInnerTexts())
      .map(t => t.trim())
      .filter(t => t && t !== 'Select' && t !== 'Blank');
    if (!labels.length) throw new Error('No salutation options found');
    const label = labels[Math.floor(Math.random() * labels.length)];
    await salutation.selectOption({ label });
    return label;
  }

  async fillForm(data: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    job?: string;
    mobile?: string;
    secondaryEmail?: string;
    address?: string;
    town?: string;
    postCode?: string;
    county?: string;
  }): Promise<void> {
    await this.firstName.waitFor({ state: 'visible' });
    await this.firstName.fill(data.firstName);

    // Salutation — random pick from the select just before First Name
    const salutation = await this.selectSalutation();
    console.log(`Salutation: ${salutation}`);

    // AssignedTo left default here (only used in bulk edit); Country left default (United Kingdom).
    if (data.lastName)       await this.surname.fill(data.lastName);
    if (data.job)            await this.jobDescription.fill(data.job);
    if (data.phone)          await this.phone.fill(data.phone);
    if (data.email)          await this.primaryEmail.fill(data.email);
    if (data.mobile)         await this.mobile.fill(data.mobile);
    if (data.secondaryEmail) await this.secondaryEmail.fill(data.secondaryEmail);
    if (data.address)        await this.streetAddress.fill(data.address);
    if (data.town)           await this.town.fill(data.town);
    if (data.postCode)       await this.postCode.fill(data.postCode);
    if (data.county)         await this.selectCounty(data.county);

    // Related To LAST — its lookup popup can steal focus, so every field goes first
    const related = await this.selectRelatedTo();
    console.log(`Related To: ${related.module} -> ${related.record || 'skipped (no records)'}`);
    // Guard: the lookup must leave us on the add-edit form
    try {
      await this.firstName.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      throw new Error('Form left the add-edit page during Related-To selection');
    }
  }

  async save() {
    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();
  }

  async searchContacts(filters: { firstName?: string; surname?: string; phone?: string }) {
    if (filters.firstName) await this.searchFirstNameInput.fill(filters.firstName);
    if (filters.surname)   await this.searchSurnameInput.fill(filters.surname);
    if (filters.phone)     await this.searchPhoneInput.fill(filters.phone);
    await this.searchBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createContact(data: Parameters<ContactPage['fillForm']>[0]) {
    await this.navigateToList();
    await this.clickCreate();
    await this.fillForm(data);
    await this.save();
  }

  // -- Row actions (list page) -----------------------------
  // Actions column icons, in order: Edit (pencil), Duplicate (copy), View (eye)
  // Optional phone narrows the match when other contacts share the same first name
  rowByName(name: string, phone?: string): Locator {
    let row = this.page.locator('tbody tr').filter({ hasText: name });
    if (phone) row = row.filter({ hasText: phone });
    return row.first();
  }

  private rowActionIcon(name: string, index: number, phone?: string): Locator {
    return this.rowByName(name, phone).locator('td').last().locator('svg').nth(index);
  }

  async clickEdit(name: string, phone?: string) {
    await this.rowActionIcon(name, 0, phone).click();
    await this.firstName.waitFor({ state: 'visible' });
  }

  async clickDuplicate(name: string, phone?: string) {
    await this.rowActionIcon(name, 1, phone).click();
    await this.firstName.waitFor({ state: 'visible' });
  }

  async clickView(name: string, phone?: string) {
    await this.rowActionIcon(name, 2, phone).click();
    await this.waitForDetailPage();
  }

  // After Save the app redirects to the contact detail page once the API call returns.
  // Wait for it, otherwise the redirect can land after we have already navigated to the list.
  async waitForDetailPage() {
    await this.page.waitForURL(/#\/home\/contacts\/detail\/\d+/);
    await this.detailEditBtn.waitFor({ state: 'visible' });
  }

  async clickDetailEdit() {
    await this.detailEditBtn.click();
    await this.firstName.waitFor({ state: 'visible' });
  }

  async findContact(firstName: string, phone?: string) {
    await this.navigateToList();
    await this.searchContacts({ firstName });
    await this.rowByName(firstName, phone).waitFor({ state: 'visible', timeout: 15000 });
  }

  // Back-compat alias (mirrors SupplierPage.findSupplier naming)
  async findSupplier(name: string, phone?: string) {
    return this.findContact(name, phone);
  }

  // -- Bulk edit (list page) -------------------------------
  rowCheckbox(row: Locator): Locator {
    return row.locator('td').first().locator('input[type="checkbox"]');
  }

  // Works whether Select Actions is a native <select> or a custom dropdown
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
    await this.page.waitForLoadState('networkidle');
  }
}
