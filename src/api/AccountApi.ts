import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class AccountApi {
  private apiContext: APIRequestContext;
  private customerId: number | null = null;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  // =========================
  // 🔧 Common Headers
  // =========================
  private getHeaders() {
    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    if (!token || !tenantPath || !logonAs) {
      throw new Error('❌ Missing authentication token / tenant / logonAs');
    }

    return {
      tenantPath,
      logonAs,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-automate-secret': process.env.AUTOMATE_SECRET!
      }
    };
  }

  // =========================
  // 🔧 Common Response Handler
  // =========================
  private async handleResponse(response: APIResponse, apiName: string) {
    const status = response.status();
    let body: any;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    console.log(`📡 ${apiName} Status: ${status}`);
    console.log(`📩 ${apiName} Response:`, body);

    if (!response.ok()) {
      throw new Error(
        `❌ ${apiName} failed: ${status}\n${JSON.stringify(body)}`
      );
    }

    return Array.isArray(body) ? body[0] : body;
  }

  // =========================
  // ⚠️ Safe handler (NO THROW)
  // Used for negative validation (like after DELETE)
  // =========================
  private async handleResponseSafe(response: APIResponse) {
    let body: any;

    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      ok: response.ok(),
      status: response.status(),
      body
    };
  }

  // =========================
  // ✅ POST (Create Account)
  // =========================
  async createAccount(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customer`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    // ✅ Store ID
    this.customerId =
      data?.customerid || data?.customer_id || data?.id;

    console.log("🆔 Stored customerId:", this.customerId);

    return data;
  }

  // =========================
  // ✅ GET (by stored ID)
  // =========================
  async getAccount() {
    if (!this.customerId) {
      throw new Error('❌ customerId not found. Call createAccount first.');
    }

    return this.getAccountById(this.customerId);
  }

  // =========================
  // ✅ GET BY ID (SAFE)
  // =========================
  async getAccountById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customers/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);

    // ❗ Do NOT throw → used for delete validation
    if (!result.ok) {
      return result.body;
    }

    return Array.isArray(result.body) ? result.body[0] : result.body;
  }

  // =========================
  // ✅ PUT (Update Account)
  // =========================
  async updateAccount(payload: any) {
    if (!this.customerId) {
      throw new Error('❌ customerId not found. Call createAccount first.');
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customers/${this.customerId}`,
      { headers, data: payload }
    );

    return await this.handleResponse(response, 'UPDATE');
  }

  // =========================
  // ⭐ UPDATE BY ID
  // =========================
  async updateCustomerById(id: number, payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customers/${id}`,
      { headers, data: payload }
    );

    return await this.handleResponse(response, 'UPDATE_BY_ID');
  }

  // =========================
  // 🗑️ DELETE
  // =========================
  async deleteAccountById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customers/${id}`,
      { headers }
    );

    return await this.handleResponse(response, 'DELETE');
  }
async searchAccounts(filter: string, ipp: number = 25, page: number = 1) {
  const { tenantPath, logonAs, headers } = this.getHeaders();

  const response = await this.apiContext.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/customer`,
    {
      headers,
      params: {
        ipp,
        page,
        filter
      }
    }
  );

  const result = await this.handleResponseSafe(response);

  if (!result.ok) {
    throw new Error(
      `❌ SEARCH failed: ${result.status}\n${JSON.stringify(result.body)}`
    );
  }

  return result.body;
}}