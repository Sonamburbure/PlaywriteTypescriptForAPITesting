import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class StaffVendorPriceApi {
  private apiContext: APIRequestContext;
  private staffvendorpriceid: number | null = null;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

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
      throw new Error(`❌ ${apiName} failed: ${status}\n${JSON.stringify(body)}`);
    }

    return Array.isArray(body) ? body[0] : body;
  }

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

  async createStaffVendorPrice(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/staffvendorprice`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    if (data?.error_msg) {
      throw new Error(`❌ CREATE failed (API error): ${JSON.stringify(data.error_msg)}`);
    }

    this.staffvendorpriceid = data?.staffvendorpriceid || data?.staffvendorprice_id || data?.id;
    console.log('🆔 Stored staffvendorpriceid:', this.staffvendorpriceid);

    return data;
  }

  async getStaffVendorPrice() {
    if (!this.staffvendorpriceid) {
      throw new Error('❌ staffvendorpriceid not found. Call createStaffVendorPrice first.');
    }

    return this.getStaffVendorPriceById(this.staffvendorpriceid);
  }

  async getStaffVendorPriceById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/staffvendorprices/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);

    if (!result.ok) {
      return result.body;
    }

    return Array.isArray(result.body) ? result.body[0] : result.body;
  }

  async updateStaffVendorPrice(payload: any) {
    if (!this.staffvendorpriceid) {
      throw new Error('❌ staffvendorpriceid not found. Call createStaffVendorPrice first.');
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/staffvendorprices/${this.staffvendorpriceid}`,
      { headers, data: payload }
    );

    return await this.handleResponse(response, 'UPDATE');
  }

  async deleteStaffVendorPriceById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/staffvendorprices/${id}`,
      { headers }
    );

    return await this.handleResponse(response, 'DELETE');
  }

  async searchStaffVendorPrices(filter: string, ipp: number = 25, page: number = 1) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/staffvendorprice`,
      {
        headers,
        params: { ipp, page, filter }
      }
    );

    const result = await this.handleResponseSafe(response);

    if (!result.ok) {
      throw new Error(`❌ SEARCH failed: ${result.status}\n${JSON.stringify(result.body)}`);
    }

    return result.body;
  }
}
