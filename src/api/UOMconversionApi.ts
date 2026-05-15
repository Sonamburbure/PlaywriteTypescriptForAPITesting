import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class UomConversionApi {
  private apiContext: APIRequestContext;
  private unitofmeasureconversionid: number | null = null;

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

  async createUomConversion(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasureconversion`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    if (data?.error_msg) {
      throw new Error(`❌ CREATE failed (API error): ${JSON.stringify(data.error_msg)}`);
    }

    this.unitofmeasureconversionid = data?.unitofmeasureconversionid || data?.unitofmeasureconversion_id || data?.id;
    console.log('🆔 Stored unitofmeasureconversionid:', this.unitofmeasureconversionid);

    return data;
  }

  async getUomConversion() {
    if (!this.unitofmeasureconversionid) {
      throw new Error('❌ unitofmeasureconversionid not found. Call createUomConversion first.');
    }

    return this.getUomConversionById(this.unitofmeasureconversionid);
  }

  async getUomConversionById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasureconversion/${id}`,
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

  async updateUomConversion(payload: any) {
    if (!this.unitofmeasureconversionid) {
      throw new Error('❌ unitofmeasureconversionid not found. Call createUomConversion first.');
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasureconversion/${this.unitofmeasureconversionid}`,
      { headers, data: payload }
    );

    const result = await this.handleResponseSafe(response);
    console.log(`📡 UPDATE Status: ${result.status}`);
    console.log(`📩 UPDATE Response:`, result.body);
    return result;
  }

  async deleteUomConversionById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasureconversion/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);
    console.log(`📡 DELETE Status: ${result.status}`);
    console.log(`📩 DELETE Response:`, result.body);
    return result;
  }

  async searchUomConversions(filter: string, ipp: number = 25, page: number = 1) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasureconversion`,
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
