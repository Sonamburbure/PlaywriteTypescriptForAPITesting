
import { Page, Locator } from '@playwright/test';

export class CreateEventPage {
  readonly page: Page;

  //readonly menuBtn: Locator;
  //readonly eventManagementBtn: Locator;
 // readonly eventListBtn: Locator;
  readonly createEventBtn: Locator;

  readonly eventName: Locator;
  readonly eventNature: Locator;
  readonly eventType: Locator;
  readonly eventStatus: Locator;

  readonly accountSearch: Locator;
  readonly accountRow: Locator;

  readonly barRequired: Locator;

  readonly venueSearch: Locator;
  readonly venueRow: Locator;

  readonly eventManager: Locator;
  readonly guestNumber: Locator;
  readonly pricingMode: Locator;
  readonly info: Locator;

  readonly startDate: Locator;
  readonly endDate: Locator;

  readonly dailyStart: Locator;
  readonly dailyEnd: Locator;

  readonly staffStart: Locator;
  readonly staffEnd: Locator;

  readonly setupDate: Locator;
  readonly cleanupDate: Locator;

  readonly saveBtn: Locator;

  // Financial Information
  readonly amountInvoiced: Locator;
  readonly amountPaid: Locator;

  // Basic Information
  readonly taskCategoryDropdown: Locator;
  readonly equipmentPlanningDropdown: Locator;
  readonly productPlanningDropdown: Locator;
  readonly barwiseExecutionDropdown: Locator;

  constructor(page: Page) {
    this.page = page;

    //this.menuBtn = page.locator("i[role='button']");
   // this.eventManagementBtn = page.getByRole('button', { name: 'Event Management', exact: true });
   // this.eventListBtn = page.getByRole('link', { name: 'Event Lists' });
    this.createEventBtn = page.getByText("Create event");

    this.eventName = page.locator("input[name='event_name']");
    this.eventNature = page.locator("select[name='event_nature']");
    this.eventType = page.locator("select[name='event_type']");
    this.eventStatus = page.locator("select[name='event_status']");

    this.accountSearch = page.locator("#btn-search").first();
    this.accountRow = page.locator("tbody.search_tbody_mobile tr").first();

    this.barRequired = page.locator("input[name='no_of_bar_required']");

    this.venueSearch = page.locator("#btn-search").nth(1);
    this.venueRow = page.locator("tbody.search_tbody_mobile tr").first();

    this.eventManager = page.locator("select[name='assign_to']");
    this.guestNumber = page.locator("input[name='no_of_guest']");
    this.pricingMode = page.locator("select[name='event_pricing_mode']");
    this.info = page.locator("textarea[name='information']");

    // Financial Information
    this.amountInvoiced = page.locator("(//input[@name='total_invoiced'])[1]");
    this.amountPaid = page.locator("(//input[@name='total_paid'])[1]");

    // Basic Information
    this.taskCategoryDropdown = page.locator("select[name='event_taskmaster']");
    this.equipmentPlanningDropdown = page.locator("select[name='event_equipment_planing_type']");
    this.productPlanningDropdown = page.locator("select[name='event_product_planing_type']");
    this.barwiseExecutionDropdown = page.locator("select[name='event_execution_type']");

    // Date fields
    this.startDate = page.locator("input[autocomplete='off']").nth(0);
    this.endDate = page.locator("input[autocomplete='off']").nth(1);

    this.dailyStart = page.locator("input[autocomplete='off']").nth(2);
    this.dailyEnd = page.locator("input[autocomplete='off']").nth(3);

    this.staffStart = page.locator("input[autocomplete='off']").nth(4);
    this.staffEnd = page.locator("input[autocomplete='off']").nth(5);

    this.setupDate = page.locator("input[autocomplete='off']").nth(6);
    this.cleanupDate = page.locator("input[autocomplete='off']").nth(7);

    this.saveBtn = page.getByRole('button', { name: 'Save' }).first();
  }

  private async setTimeField(locator: Locator, value: string) {
    await locator.scrollIntoViewIfNeeded();

    await locator.evaluate((el: HTMLInputElement, val: string) => {
      el.removeAttribute('readonly');
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }, value);

    await locator.press('Enter');
  }

  async createEvent() {

    //await this.menuBtn.click();
    //await this.eventManagementBtn.click();
    //await this.eventListBtn.click();
    await this.createEventBtn.click();

    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);
    end.setDate(start.getDate() + 1);

    const setup = new Date(start);
    setup.setDate(start.getDate() - 1);

    const cleanup = new Date(end);
    cleanup.setDate(end.getDate() + 1);

    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}-${day}`;
    };

    const formatDateTime = (d: Date, time: string) => `${formatDate(d)} ${time}`;

    const eventName = `Event_${formatDate(today)}`;

    await this.eventName.fill(eventName);
    await this.eventNature.selectOption("446");
    await this.eventType.selectOption("448");
    await this.eventStatus.selectOption("452");

    await this.accountSearch.click();
    await this.accountRow.click();

    await this.barRequired.fill("4");

    await this.venueSearch.click();
    await this.venueRow.click();

    await this.eventManager.selectOption({ index: 6 });

    await this.guestNumber.fill("250");
    await this.pricingMode.selectOption("646");

    await this.info.fill("“Be on time , good vibes only .”");

    // Financial Information
    await this.amountInvoiced.scrollIntoViewIfNeeded();
    await this.amountInvoiced.fill("1000");
    await this.amountPaid.fill("500");

    // Basic Information
    await this.taskCategoryDropdown.selectOption("641");
    await this.equipmentPlanningDropdown.selectOption("648");
    await this.productPlanningDropdown.selectOption("651");
    await this.barwiseExecutionDropdown.selectOption("827");

    // Date fields
    await this.setTimeField(this.startDate, formatDate(start));
    await this.setTimeField(this.endDate, formatDate(end));

    await this.setTimeField(this.dailyStart, "09:00");
    await this.setTimeField(this.dailyEnd, "10:30");

    await this.setTimeField(this.staffStart, "08:00");
    await this.setTimeField(this.staffEnd, "11:00");

    await this.setTimeField(this.setupDate, formatDateTime(setup, "13:58"));
    await this.setTimeField(this.cleanupDate, formatDateTime(cleanup, "13:58"));

    await this.saveBtn.scrollIntoViewIfNeeded();
    await this.saveBtn.click();

    console.log("✅ Event created successfully");
}};


