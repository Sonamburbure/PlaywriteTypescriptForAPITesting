import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class UomApi {
  private apiContext: APIRequestContext;
  private unitofmeasureid: number | null = null;

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

  async createUom(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasure`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    if (data?.error_msg) {
      throw new Error(`❌ CREATE failed (API error): ${JSON.stringify(data.error_msg)}`);
    }

    this.unitofmeasureid = data?.unitofmeasureid || data?.unitofmeasure_id || data?.id;
    console.log('🆔 Stored unitofmeasureid:', this.unitofmeasureid);

    return data;
  }

  async getUom() {
    if (!this.unitofmeasureid) {
      throw new Error('❌ unitofmeasureid not found. Call createUom first.');
    }

    return this.getUomById(this.unitofmeasureid);
  }

  async getUomById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasure/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);

    console.log(`📡 GET Status: ${result.status}`);
    console.log(`📩 GET Response:`, result.body);

    if (!result.ok) {
      return result.body;
    }

    const raw = Array.isArray(result.body) ? result.body[0] : result.body;
    if (raw?.data) {
      return Array.isArray(raw.data) ? raw.data[0] : raw.data;
    }
    return raw;
  }

  async updateUom(payload: any) {
    if (!this.unitofmeasureid) {
      throw new Error('❌ unitofmeasureid not found. Call createUom first.');
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasure/${this.unitofmeasureid}`,
      { headers, data: payload }
    );

    const result = await this.handleResponseSafe(response);
    console.log(`📡 UPDATE Status: ${result.status}`);
    console.log(`📩 UPDATE Response:`, result.body);
    return result;
  }

  async deleteUomById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasure/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);
    console.log(`📡 DELETE Status: ${result.status}`);
    console.log(`📩 DELETE Response:`, result.body);
    return result;
  }

  async searchUoms(filter: string, ipp: number = 25, page: number = 1) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasure`,
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
