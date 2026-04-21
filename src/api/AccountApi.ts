import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext } from '@playwright/test';

export class AccountApi {
  private apiContext: APIRequestContext;
  private customerId: number | null = null;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  // =========================
  // ✅ POST (Create Account)
  // =========================
  async createAccount(payload: any) {
    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    if (!token || !tenantPath || !logonAs) {
      throw new Error('❌ Missing authentication token / tenant / logonAs');
    }

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customer`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-automate-secret': process.env.AUTOMATE_SECRET!
        },
        data: payload,
      }
    );

    const responseBody = await response.json();

    if (!response.ok()) {
      throw new Error(
        `❌ Account API failed: ${response.status()} \n${JSON.stringify(responseBody)}`
      );
    }

    // ✅ Normalize response (array or object)
    const data = Array.isArray(responseBody) ? responseBody[0] : responseBody;

    // ✅ Store customerId safely
    this.customerId = data?.customerid || data?.customer_id || data?.id;

    console.log("🆔 Stored customerId:", this.customerId);

    return data;
  }

  // =========================
  // ✅ GET (Fetch Account)
  // =========================
  async getAccount() {
    if (!this.customerId) {
      throw new Error('❌ customerId not found. Call createAccount first.');
    }

    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    if (!token || !tenantPath || !logonAs) {
      throw new Error('❌ Missing authentication token / tenant / logonAs');
    }

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customers/${this.customerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-automate-secret': process.env.AUTOMATE_SECRET!
        }
      }
    );

    const responseBody = await response.json();

    if (!response.ok()) {
      throw new Error(
        `❌ GET API failed: ${response.status()} \n${JSON.stringify(responseBody)}`
      );
    }

    // ✅ Normalize response
    const data = Array.isArray(responseBody) ? responseBody[0] : responseBody;

    return data;
  }

  // =========================
  // ✅ PUT (Update Account)
  // =========================
  async updateAccount(payload: any) {
    if (!this.customerId) {
      throw new Error('❌ customerId not found. Call createAccount first.');
    }

    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    if (!token || !tenantPath || !logonAs) {
      throw new Error('❌ Missing authentication token / tenant / logonAs');
    }

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customers/${this.customerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-automate-secret': process.env.AUTOMATE_SECRET!
        },
        data: payload,
      }
    );

    const responseBody = await response.json();

    if (!response.ok()) {
      throw new Error(
        `❌ PUT API failed: ${response.status()} \n${JSON.stringify(responseBody)}`
      );
    }

    // ✅ Normalize response
    const data = Array.isArray(responseBody) ? responseBody[0] : responseBody;

    return data;
  }
}