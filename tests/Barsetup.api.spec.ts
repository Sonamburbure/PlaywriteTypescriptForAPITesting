import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
} from '../src/utils/tokenStore.js';
import { LOGON_AS, BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- UK BAR SETUP DATA ---------------- */

const UK_CITIES = [
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Bristol',
  'Liverpool',
  'Nottingham',
];

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}

function generateUKBarSetupName() {
  const city = UK_CITIES[Math.floor(Math.random() * UK_CITIES.length)];
  const today = new Date().toISOString().split('T')[0];
  return `${city} Corporate Bar Setup – ${today}`;
}

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
    const response = await this.apiContext!.get(
      `${BASE_API_URL}/api/tenant-options`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body.data || [];
  }

  async login(email: string, password: string, tenantName: string) {
    await this.init();
    const response = await this.apiContext!.post(
      `${BASE_API_URL}/api/login`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { email, password, tenant_name: tenantName },
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body.token).toBeTruthy();
    expect(body.tenant_cname).toBeTruthy();
    expect(body.logon_as).toBeTruthy();

    return body;
  }
}

/* ---------------- BAR SETUP API ---------------- */

class BarSetupApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createBarSetup(payload: any) {
    await this.init();

    const token = getAuthToken();
    const tenantPath = getTenantPath();

    expect(token).toBeTruthy();
    expect(tenantPath).toBeTruthy();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${tenantPath}/api/${LOGON_AS}/barsetup`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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

test('API only: login and create Bar Setup', async () => {
  const authApi = new AuthApi();

  // 1️⃣ Fetch tenant
  const tenants = await authApi.fetchTenantOptions();

  const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, '');

  const tenant = tenants.find(
    (t: any) => normalize(t.optionlabel) === normalize('Dream Events')
  );

  if (!tenant) {
    console.warn(
      '⚠️ Tenant not found. Available tenants:',
      tenants.map((t: any) => t.optionlabel)
    );
    return;
  }

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
  expect(getTenantPath()).toBeTruthy();

  // 3️⃣ Generate meaningful UK Bar Setup data
  const barSetupName = generateUKBarSetupName();
  const dateTime = getCurrentDateTime();

  // 4️⃣ Payload (ALL fields preserved)
  const payload = {
    barsetup_num: '00000000000',

    custom: {
      barsetup_name: barSetupName,
      barsetup_category: 627,
      barsetup_subcategory: 629,
      barsetup_status: 631,
      barsetup_type: 633,
      barsetup_product_required: 634,
      barsetup_equipment_required: 636,
      barsetup_staff_required: 638,
      ownerid: 6,
      createtime: dateTime,
      modifiedtime: dateTime,
      assign_to: 'Sonam Burbure',
    },

    source: 'web',
    status: '1',
  };

  console.log('Final Bar Setup Payload:', JSON.stringify(payload, null, 2));

  // 5️⃣ Create Bar Setup
  const barSetupApi = new BarSetupApi();
  const response = await barSetupApi.createBarSetup(payload);

  console.log('Create Bar Setup API response:', response);

  // 6️⃣ Assertions
  const barSetup = Array.isArray(response) ? response[0] : response;

  expect(barSetup).toBeTruthy();
  expect(barSetup.barsetupid).toBeTruthy();
  expect(typeof barSetup.barsetupid).toBe('number');

  console.log('Created Bar Setup ID:', barSetup.barsetupid);
});
