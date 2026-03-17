import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
} from '../src/utils/tokenStore.js';
import { LOGON_AS, BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- UTILS ---------------- */

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
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
        data: {
          email,
          password,
          tenant_name: tenantName,
        },
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

  const dateTime = getCurrentDateTime();

  // 3️⃣ Payload
  const payload = {
    segment1_num: "00000000000",
    custom: {
      segment1_name: "Fruit Juice",
      segment_type: 532,
      cost_type: 535,
      serial_lot_control: 550,
      related_unitofmeasure: 15,
      segment1_consumable_uom: 527,
      ownerid: 6,
      createtime: dateTime,
      modifiedtime: dateTime,
      assign_to: "Sonam Burbure"
    },
    source: "web",
    status: "1"
  };

  console.log('Final Payload:', JSON.stringify(payload, null, 2));

  // 4️⃣ Create account
  const accountApi = new AccountApi();
  const response = await accountApi.createAccount(payload);

  console.log('Create Account API response:', response);

  // 5️⃣ Assertions
  const result = Array.isArray(response) ? response[0] : response;

  expect(result).toBeTruthy();

  console.log('API Result:', result);
});