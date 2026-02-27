import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
} from '../src/utils/tokenStore.js';
import { BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';
import fs from 'fs';
import path from 'path';

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
    return await response.json();
  }
}

/* ---------------- TEST ---------------- */

test('API only: login and run sequential imports', async () => {
  const authApi = new AuthApi();

  /* ---------- 1️⃣ FETCH TENANT ---------- */
  const tenants = await authApi.fetchTenantOptions();

  const tenant = tenants.find(
    (t: any) =>
      t.optionlabel.toLowerCase().replace(/\s+/g, '') === 'dreamevents'
  );

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  /* ---------- 2️⃣ LOGIN ---------- */
  const loginResponse = await authApi.login(
    EMAIL,
    PASSWORD,
    tenant.optionvalue
  );

  setAuthToken(loginResponse.token);
  setTenantPath(loginResponse.tenant_cname);
  setLogonAs(loginResponse.logon_as);

  const token = getAuthToken();
  const tenantPath = getTenantPath();
  const logonAs = loginResponse.logon_as;

  expect(token).toBeTruthy();
  expect(tenantPath).toBeTruthy();

  /* ---------- 3️⃣ CREATE API CONTEXT ---------- */
  const apiContext = await request.newContext();

  /* ---------- 4️⃣ IMPORT CONFIGURATION ---------- */
  const importJobs: {
    file: string;
    type: 'customer' | 'supplier' | 'contact' | 'venue' | 'comment';
  }[] = [
    { file: 'Sample_Accounts (1).xlsx', type: 'customer' },
    { file: 'Sample_Supplier.xlsx', type: 'supplier' },
    { file: 'Sample_Contact.xlsx', type: 'contact' },
    { file: 'Sample_Venue.xlsx', type: 'venue' },
    { file: 'Sample_Comment.xlsx', type: 'comment' },
  ];

  /* ---------- 5️⃣ RUN IMPORTS SEQUENTIALLY ---------- */
  for (const job of importJobs) {
    console.log(`\n🚀 Running ${job.type.toUpperCase()} import...`);

    // ✅ Use relative path from test file (__dirname)
    const filePath = path.join(__dirname, 'test-data', job.file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const response = await apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/${job.type}import`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        multipart: {
          file: fs.createReadStream(filePath),
        },
      }
    );

    console.log(`${job.type} Import Status:`, response.status());

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    console.log(`${job.type} Import Response:`, body);
  }

  console.log('\n✅ All imports completed successfully');
});