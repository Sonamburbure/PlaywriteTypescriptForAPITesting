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

/* ---------------- UK ITEM SERVED NAMES ---------------- */

const UK_ITEM_NAMES = [
  'British Canapés',
  'Fish and Chips',
  'Afternoon Tea',
  'Mini Sausage Rolls',
  'Roast Chicken Bites',
  'Cheese and Crackers',
  'Yorkshire Pudding Snacks',
];

/* ---------------- UTILS ---------------- */

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function generateItemServedName() {
  const baseName =
    UK_ITEM_NAMES[Math.floor(Math.random() * UK_ITEM_NAMES.length)];
  return `${baseName}_${getCurrentDate()}`;
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

/* ---------------- ITEM SERVED API ---------------- */

class ItemServedApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createItemServed(payload: any) {
    await this.init();

    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    expect(token).toBeTruthy();
    expect(tenantPath).toBeTruthy();
    expect(logonAs).toBeTruthy();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/itemserved`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok(), '❌ ItemServed create API failed').toBeTruthy();
    return await response.json();
  }
}

/* ---------------- TEST ---------------- */

test('API only: login and create Item Served', async () => {
  const authApi = new AuthApi();

  // 1️⃣ Fetch tenant (Dream Events)
  const tenants = await authApi.fetchTenantOptions();
  const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, '');

  const tenant = tenants.find(
    (t: any) => normalize(t.optionlabel) === normalize('Dream Events')
  );

  if (!tenant) {
    throw new Error('Tenant "Dream Events" not found');
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

  // 3️⃣ Generate UK item name
  const itemName = generateItemServedName();
  const dateTime = getCurrentDateTime();

  // 4️⃣ Payload (NO FIELD SKIPPED)
  const payload = {
    itemserved_num: '00000000000',
    custom: {
      itemserved_name: itemName,
      itemserved_category: 609,
      itemserved_subcategory: 1153,
      itemserved_status: 618,
      itemserved_type: 620,
      itemserved_product_required: 621,
      itemserved_equipment_required: 623,
      itemserved_staff_required: 625,
      ownerid: 6,
      createtime: dateTime,
      modifiedtime: dateTime,
      assign_to: 'Sonam Burbure',
    },
    source: 'web',
    status: '1',
  };

  console.log('Final ItemServed Payload:', JSON.stringify(payload, null, 2));

  // 5️⃣ Create Item Served
  const itemApi = new ItemServedApi();
  const response = await itemApi.createItemServed(payload);

  console.log('Create ItemServed API response:', response);

  // 6️⃣ Assertions
  const item = Array.isArray(response) ? response[0] : response;

  expect(item, '❌ ItemServed response empty').toBeTruthy();
  expect(item.itemservedid, '❌ itemservedid missing').toBeTruthy();
  expect(typeof item.itemservedid).toBe('number');

  expect(
    item.itemserved_name ?? item.custom?.itemserved_name
  ).toContain(itemName.split('_')[0]);

  console.log('✅ Created ItemServed ID:', item.itemservedid);
});
