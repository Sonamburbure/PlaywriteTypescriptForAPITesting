import { test, expect } from '@playwright/test';
import { UserApi } from '../../src/apiPages/UserApi';
import { EventApi } from '../../src/apiPages/EventApi';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../../src/utils/tokenstore';

test.setTimeout(60000);

// --------------------
// 🔹 Credentials
// --------------------
const email = 'sonam.burbure@accellier.com';
const password =
  'SXhOGfV/YzGpz8yeT7albMXFwWybYpSpxSvCDLKJAyLQKaDvSpmtvtRXEU88yCqUbWXgcjyXCnDtzfxwp3BeQSWmVgnro1xUBu80BpVirr0BdaLue34idDiIdkjFAW5mYE+NjCHdSQLdhdvfWjLMju83vh/7C3GD/0XDWyBnACE=';
const tenantName =
  'eyJpdiI6ImVzaGJOdmNEUTZEQWk5a2FVNXZIeXc9PSIsInZhbHVlIjoiRXNiSTBFVFQ3WVZRZ0gxQVpoU3p0Zz09IiwibWFjIjoiOWQ4NTFhY2NlYWE2ZWU3OTc1M2Q4YmM0YjE0ZjFlZjlmOTlhOTM2NWJiZmNkMDhmNTM3YTI5MmUzMjcyMGU3OCIsInRhZyI6IiJ9';

// --------------------
// 🔹 Date Helpers
// --------------------
const formatDate = (date: Date): string =>
  date.toISOString().split('T')[0];

const formatDateTime = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

// --------------------
// 🔹 Dynamic Dates
// --------------------
const today = new Date();

const eventStartDate = new Date(today);
const eventEndDate = new Date(today);
eventEndDate.setDate(today.getDate() + 1);

const setupDate = new Date(eventStartDate);
setupDate.setDate(eventStartDate.getDate() - 1);

const cleanupDate = new Date(eventEndDate);
cleanupDate.setDate(eventEndDate.getDate() + 1);

const eventName = `Event_${formatDate(today)}`;

// --------------------
// 🔹 Event Payload
// --------------------
const eventPayload = {
  event_num: '00000000000',
  custom: {
    event_name: eventName,
    event_nature: '446',
    event_type: '448',
    event_status: '451',
    related_customer: 357,
    no_of_bar_required: 2,
    related_venue: 2,
    ownerid: 18,
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

// --------------------
// 🔹 Login
// --------------------
test.beforeAll(async ({ request }) => {
  const userApi = new UserApi(request);
  const loginResult = await userApi.login(email, password, tenantName);

  setTenantPath(loginResult.tenantCname);
  setLogonAs(loginResult.logonAs);
  setAuthToken(loginResult.token);

  expect(getTenantPath()).toBeTruthy();
  expect(getLogonAs()).toBeTruthy();
  expect(getAuthToken()).toBeTruthy();

  console.log('✅ Login successful');
});

// --------------------
// 🔹 Create Event Test
// --------------------
test('Create Event using API', async ({ request }) => {
  const eventApi = new EventApi(request);

  const response = await eventApi.createEvent(eventPayload);
  console.log('Create Event Response:', response);

  expect(Array.isArray(response)).toBeTruthy();
  expect(response.length).toBeGreaterThan(0);

  const event = response[0];

  expect(event.eventid).toBeTruthy();
  expect(event.event_name).toBe(eventPayload.custom.event_name);
  expect(event.event_start_date).toBe(eventPayload.custom.event_start_date);
  expect(event.event_end_date).toBe(eventPayload.custom.event_end_date);
  expect(event.assign_to).toBe(eventPayload.custom.assign_to);

  console.log('🎉 Event created with dynamic dates successfully');
});
