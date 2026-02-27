import { test, expect } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../src/utils/tokenStore.js';
import { BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';
import { BarcardApi } from '../src/api/BarcardApi.js';
import { EventApi } from '../src/api/EventApi.js';
import { createEventAndBarCard } from '../src/helpers/smokehelpers.js';

/* ---------------- AUTH API ---------------- */
class AuthApi {
  constructor(private request: any) {}

  async fetchTenantOptions() {
    const response = await this.request.get(`${BASE_API_URL}/api/tenant-options`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body.data || [];
  }

  async login(email: string, password: string, tenantName: string) {
    const response = await this.request.post(`${BASE_API_URL}/api/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email, password, tenant_name: tenantName },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.tenant_cname).toBeTruthy();
    expect(body.logon_as).toBeTruthy();
    return body;
  }
}

/* ---------------- TEST ---------------- */
test('API only: login and create event test', async ({ request }) => {
  const authApi = new AuthApi(request);

  // Step 1: Fetch tenant options
  const tenants = await authApi.fetchTenantOptions();
  const tenant = tenants.find((t: any) =>
    t.optionlabel?.toLowerCase().includes('dream')
  );
  if (!tenant) throw new Error('Dream Events tenant not found');

  // Step 2: Login
  const loginResponse = await authApi.login(EMAIL, PASSWORD, tenant.optionvalue);
  setAuthToken(loginResponse.token);
  setTenantPath(loginResponse.tenant_cname);
  setLogonAs(loginResponse.logon_as);

  expect(getAuthToken()).toBeTruthy();
  expect(getTenantPath()).toBeTruthy();
  expect(getLogonAs()).toBeTruthy();

  /* -------- DATE HELPERS -------- */
  const today = new Date();
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  const formatDateTime = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  /* -------- EVENT DATES -------- */
  const eventStartDate = new Date(today);
  const eventEndDate = new Date(today);
  eventEndDate.setDate(today.getDate() + 1);

  const setupDate = new Date(eventStartDate);
  setupDate.setDate(eventStartDate.getDate() - 1);

  const cleanupDate = new Date(eventEndDate);
  cleanupDate.setDate(eventEndDate.getDate() + 1);

  /* -------- FULL EVENT PAYLOAD -------- */
  const eventPayload = {
    event_num: '00000000000',
    custom: {
      event_name: `Event_${formatDate(today)}`,
      event_nature: '446',
      event_type: '448',
      event_status: '451',
      related_customer: 357,
      no_of_bar_required: 2,
      related_venue: 2,
      ownerid: 6,
      no_of_guest: 200,
      event_pricing_mode: '646',
      information: 'API Automation123',
      createtime: formatDateTime(today),
      modifiedtime: formatDateTime(today),
      event_start_date: formatDate(eventStartDate),
      event_end_date: formatDate(eventEndDate),
      daily_start_time: '09:00',
      daily_end_time: '10:00',
      staff_start_time: '08:00',
      staff_end_time: '11:00',
      setup_datetime: formatDateTime(setupDate),
      cleanup_datetime: formatDateTime(cleanupDate),
      gross_sales_amount: '5000.00',
      total_sales: '100.00',
      Commission: '200.00',
      budgeted_cogs: '10.00',
      budgeted_payrol: '1.00',
      budgeted_opex: '10.00',
      budgeted_others: '10.00',
      net_profit: '10.00',
      total_invoiced: '10.00',
      total_paid: '10.00',
      event_taskmaster: '640',
      event_equipment_planing_type: '648',
      event_product_planing_type: '651',
      event_execution_type: '827',
      assign_to: 'Sonam Burbure',
    },
    source: 'web',
    status: '1',
  };

  /* -------- BAR CARD DATES -------- */
  const barStartDate = new Date(eventStartDate);
  const barEndDate = new Date(eventEndDate);

  const barSetupDate = new Date(barStartDate);
  barSetupDate.setDate(barStartDate.getDate() - 1);

  const barCleanupDate = new Date(barEndDate);
  barCleanupDate.setDate(barEndDate.getDate() + 1);

  // Helper: strictly format BarCard datetime as YYYY-MM-DD HH:MM:SS
  const formatBarDateTimeStrict = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  /* -------- FULL BAR CARD PAYLOAD -------- */
  /* -------- BAR CARD PAYLOAD (dynamic based on event) -------- */
const barCardPayload: any = {
  eventbarcard_num: '00000000000',
  status: '1',
  source: 'web',

  // Top-level required fields (keep createtime & modifiedtime fixed or dynamic)
  createtime: '2026-02-19 16:08:15',    // can also use formatDateTime(today)
  modifiedtime: '2026-02-19 16:08:15',

  custom: {
    eventbarcard_name: 'Bar1',
    // Dynamically match Event setup & cleanup datetime
    eventbarcard_setupdatetime: eventPayload.custom.setup_datetime,
    eventbarcard_cleanupdatetime: eventPayload.custom.cleanup_datetime,

    // BarCard start/end match Event start/end
    eventbarcard_start_date: eventPayload.custom.event_start_date,
    eventbarcard_end_date: eventPayload.custom.event_end_date,

    related_event: '44',             // or eventId if returned dynamically
    related_barsetup: 3,
    related_eventmenu: 2,
    eventbarcard_barsetup_addon: '',
    assign_to: 'Sonam Burbure',
    ownerid: 6,
  },
};
  /* -------- CREATE API INSTANCES -------- */
  const eventApi = new EventApi(request);
  const barCardApi = new BarcardApi(request);

  /* -------- EXECUTE SMOKE FLOW -------- */
  const result = await createEventAndBarCard(
    eventApi,
    barCardApi,
    eventPayload,
    barCardPayload
  );

  console.log('🎉 Smoke Event ID:', result.eventId);
  console.log('🍸 Smoke BarCard ID:', result.barCardId);

  /* -------- ASSERTIONS -------- */
  expect(result.eventId).toBeTruthy();
  expect(result.barCardId).toBeTruthy();
});
