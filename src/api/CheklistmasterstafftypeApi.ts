import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class ChecklistMasterStaffTypeApi {
  private apiContext: APIRequestContext;
  private eventcheckliststafftypeid: number | null = null;

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

  async createChecklistStaffType(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventcheckliststafftype`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    this.eventcheckliststafftypeid = data?.eventcheckliststafftypeid || data?.eventcheckliststafftype_id || data?.id;
    console.log('🆔 Stored eventcheckliststafftypeid:', this.eventcheckliststafftypeid);

    return data;
  }

  async getChecklistStaffType() {
    if (!this.eventcheckliststafftypeid) {
      throw new Error('❌ eventcheckliststafftypeid not found. Call createChecklistStaffType first.');
    }

    return this.getChecklistStaffTypeById(this.eventcheckliststafftypeid);
  }

  async getChecklistStaffTypeById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventcheckliststafftypes/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);

    if (!result.ok) {
      return result.body;
    }

    return Array.isArray(result.body) ? result.body[0] : result.body;
  }

  async updateChecklistStaffType(payload: any) {
    if (!this.eventcheckliststafftypeid) {
      throw new Error('❌ eventcheckliststafftypeid not found. Call createChecklistStaffType first.');
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventcheckliststafftypes/${this.eventcheckliststafftypeid}`,
      { headers, data: payload }
    );

    return await this.handleResponse(response, 'UPDATE');
  }

  async deleteChecklistStaffTypeById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventcheckliststafftypes/${id}`,
      { headers }
    );

    return await this.handleResponse(response, 'DELETE');
  }

  async searchChecklistStaffTypes(filter: string, ipp: number = 25, page: number = 1) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventcheckliststafftype`,
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
