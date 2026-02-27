import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
} from '../src/utils/tokenStore.js';
import { LOGON_AS, BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- UK NAME DATA ---------------- */

const UK_FIRST_NAMES = [
  'James', 'Oliver', 'Harry', 'George', 'Noah',
  'Jack', 'Leo', 'Charlie', 'Jacob', 'Alfie',
  'Emily', 'Amelia', 'Olivia', 'Isla', 'Ava',
  'Sophia', 'Mia', 'Charlotte', 'Ella', 'Grace'
];

const UK_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor',
  'Wilson', 'Davies', 'Evans', 'Thomas', 'Roberts',
  'Walker', 'Wright', 'Thompson', 'White', 'Hughes'
];

/* ---------------- UTILS ---------------- */

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}

function generateCustomerData() {
  const firstName =
    UK_FIRST_NAMES[Math.floor(Math.random() * UK_FIRST_NAMES.length)];
  const lastName =
    UK_LAST_NAMES[Math.floor(Math.random() * UK_LAST_NAMES.length)];

  const timestamp = Date.now();

  return {
    customerName: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${timestamp}@mail.com`,
  };
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

/* ---------------- ACCOUNT API ---------------- */

class AccountApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createAccount(payload: any) {
    await this.init();

    const token = getAuthToken();
    const tenantPath = getTenantPath();

    expect(token).toBeTruthy();
    expect(tenantPath).toBeTruthy();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${tenantPath}/api/${LOGON_AS}/customer`,
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

test('API only: login and create Account', async () => {
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

  // 3️⃣ Generate meaningful UK customer data
  const { customerName, email } = generateCustomerData();
  const dateTime = getCurrentDateTime();
  const currentDate = dateTime.split(' ')[0];

  // 4️⃣ Payload (unchanged except meaningful name)
  const payload = {
    customer_num: '00000000000',

    custom: {
      customer_name: `${customerName}_${currentDate}`,
      customer_phone: '123456789',
      customer_email: email,
      assign_to: 'Sonam Burbure',
      ownerid: 6,
      createtime: dateTime,
      modifiedtime: dateTime,
      customer_address: 'abc',
      customer_city: 'NewTown',
      customer_post_code: '12345',
      customer_county: 5,
      customer_country: 1,
    },

    source: 'web',
    status: '1',
  };

  console.log('Final Payload:', JSON.stringify(payload, null, 2));

  // 5️⃣ Create account
  const accountApi = new AccountApi();
  const response = await accountApi.createAccount(payload);

  console.log('Create Account API response:', response);

  // 6️⃣ Assertions
  const account = Array.isArray(response) ? response[0] : response;

  expect(account).toBeTruthy();
  expect(account.customerid).toBeTruthy();
  expect(typeof account.customerid).toBe('number');

  console.log('Created Account ID:', account.customerid);
});
