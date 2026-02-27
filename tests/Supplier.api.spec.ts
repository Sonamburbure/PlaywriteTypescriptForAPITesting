import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
} from '../src/utils/tokenStore.js';
import { LOGON_AS, BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- UK SUPPLIER NAME DATA ---------------- */

const UK_SUPPLIER_NAMES = [
  'London Catering',
  'Manchester Events',
  'Bristol Supplies',
  'Leeds Hospitality',
  'Birmingham Services',
  'Oxford Event Co',
  'Cambridge Logistics',
  'Nottingham Planners',
  'Brighton Caterers',
  'Yorkshire Events',
];

/* ---------------- UTILS ---------------- */

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}

function generateSupplierName() {
  const baseName =
    UK_SUPPLIER_NAMES[Math.floor(Math.random() * UK_SUPPLIER_NAMES.length)];
  const currentDate = new Date().toISOString().split('T')[0];

 
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

/* ---------------- SUPPLIER API ---------------- */

class SupplierApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createSupplier(payload: any) {
    await this.init();

    const token = getAuthToken();
    const tenantPath = getTenantPath();

    expect(token).toBeTruthy();
    expect(tenantPath).toBeTruthy();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${tenantPath}/api/${LOGON_AS}/supplier`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    if (!response.ok()) {
      throw new Error(
        `❌ Supplier API failed with status ${response.status()}`
      );
    }

    return await response.json();
  }
}

/* ---------------- TEST ---------------- */

test('API only: login and create Supplier', async () => {
  const authApi = new AuthApi();

  // 1️⃣ Fetch tenant (Dream Events fix applied)
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

  expect(getAuthToken()).toBeTruthy();
  expect(getTenantPath()).toBeTruthy();

  // 3️⃣ Generate meaningful UK supplier name
  const supplierName = generateSupplierName();
  const dateTime = getCurrentDateTime();

  // 4️⃣ Payload (NO field skipped)
  const payload = {
    supplier_num: '00000000000',
    custom: {
      supplier_name: supplierName,
      supplier_status: 193,
      supplier_category: '762',
      supplier_rating: '201',
      ownerid: 6,
      createtime: dateTime,
      modifiedtime: dateTime,
      supplier_address: 'NewStreet',
      supplier_city: 'NewTown',
      supplier_post_code: '12345',
      supplier_county: 5,
      supplier_country: 1,
      assign_to: 'Sonam Burbure',
    },
    source: 'web',
    status: '1',
  };

  console.log('Final Supplier Payload:', JSON.stringify(payload, null, 2));

  // 5️⃣ Create supplier
  const supplierApi = new SupplierApi();
  const response = await supplierApi.createSupplier(payload);

  console.log('Create Supplier API response:', response);

  // 6️⃣ Assertions (STRICT)
  const supplier = Array.isArray(response) ? response[0] : response;

  expect(supplier, '❌ Supplier response is empty').toBeTruthy();

  expect(
    supplier.supplierid,
    '❌ supplierid missing in response'
  ).toBeTruthy();

  expect(
    typeof supplier.supplierid,
    '❌ supplierid is not a number'
  ).toBe('number');

  // Optional deep validation
  expect(supplier.supplier_name ?? supplier.custom?.supplier_name)
    

  console.log('✅ Created Supplier ID:', supplier.supplierid);
});
