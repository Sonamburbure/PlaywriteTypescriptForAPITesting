import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../src/utils/tokenStore.js';
import { BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- AUTH API ---------------- */

class AuthApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async fetchTenantOptions() {
    await this.init();

    const response = await this.apiContext!.get(`${BASE_API_URL}/api/tenant-options`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body.data || [];
  }

  async login(email: string, password: string, tenantName: string) {
    await this.init();

    const response = await this.apiContext!.post(`${BASE_API_URL}/api/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email, password, tenant_name: tenantName },
    });

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}

/* ---------------- EVENT API ---------------- */

class EventApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createEvent(payload: any) {
    await this.init();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${getTenantPath()}/api/${getLogonAs()}/event`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}

/* ---------------- BAR CARD API ---------------- */

class BarCardApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createBarCard(payload: any) {
    await this.init();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${getTenantPath()}/api/${getLogonAs()}/eventbarcard`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}

/* ---------------- TEST ---------------- */

test('API: Create Barcard for Event', async () => {
  const authApi = new AuthApi();

  // 1️⃣ Fetch Tenant
  const tenants = await authApi.fetchTenantOptions();
  const tenant = tenants.find((t: any) =>
    t.optionlabel?.toLowerCase().includes('dream')
  );

  if (!tenant) throw new Error('Dream Events tenant not found');

  // 2️⃣ Login
  const loginResponse = await authApi.login(
    EMAIL,
    PASSWORD,
    tenant.optionvalue
  );

  setAuthToken(loginResponse.token);
  setTenantPath(loginResponse.tenant_cname);
  setLogonAs(loginResponse.logon_as);

  expect(getAuthToken()).toBeTruthy();
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

  const eventStartDate = new Date(today);
  const eventEndDate = new Date(today);
  eventEndDate.setDate(today.getDate() + 1);

  const setupDate = new Date(eventStartDate);
  setupDate.setDate(eventStartDate.getDate() - 1);

  const cleanupDate = new Date(eventEndDate);
  cleanupDate.setDate(eventEndDate.getDate() + 1);

  // 3️⃣ Create Event (Dependency)
  const eventApi = new EventApi();

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
  const createdEvent = await eventApi.createEvent(eventPayload);
  const eventId = createdEvent[0]?.eventid;

  expect(eventId).toBeTruthy();
  console.log('🎉 Event ID:', eventId);

  /* -------- BAR CARD DATE SETUP -------- */

// Helper to format date as "Y-m-d H:i:s"
const formatbarcardDateTime = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

// Convert event dates
const barStartDate = new Date(eventStartDate);
const barEndDate = new Date(eventEndDate);

const barSetupDate = new Date(barStartDate);
barSetupDate.setDate(barStartDate.getDate() - 1);

const barCleanupDate = new Date(barEndDate);
barCleanupDate.setDate(barEndDate.getDate() + 1);

// 4️⃣ Create Barcard
const barCardApi = new BarCardApi();

const barCardPayload = {
  eventbarcard_num: '00000000000',

  // ✅ REQUIRED FIELDS
  assign_to: 6, // use valid user id
  createtime: formatDateTime(new Date()),
  modifiedtime: formatDateTime(new Date()),

  custom: {
    eventbarcard_name: `Bar_${Date.now()}`,
    eventbarcard_setupdatetime: formatDateTime(barSetupDate),
    eventbarcard_cleanupdatetime: formatDateTime(barCleanupDate),
    eventbarcard_start_date: `${barStartDate.getFullYear()}-${String(barStartDate.getMonth() + 1).padStart(2, '0')}-${String(barStartDate.getDate()).padStart(2, '0')}`, // Y-m-d
    eventbarcard_end_date: `${barEndDate.getFullYear()}-${String(barEndDate.getMonth() + 1).padStart(2, '0')}-${String(barEndDate.getDate()).padStart(2, '0')}`, // Y-m-d
    related_event: eventId,
    related_barsetup: 3,
    related_eventmenu: 2,
    ownerid: 6,
  },

  source: 'web',
  status: '1',
};

const createdBarCard = await barCardApi.createBarCard(barCardPayload);
const barCardId = createdBarCard[0]?.eventbarcardid;

console.log('🍸 Bar Card ID:', barCardId);
expect(barCardId).toBeTruthy();})
