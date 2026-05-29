import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class EventChecklistdetailApi {
  private apiContext: APIRequestContext;
  private eventchecklistresponseid: number | null = null;

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

  getLastCreatedId(): number | null {
    return this.eventchecklistresponseid;
  }

  async createEventChecklistDetail(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklistresponse`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    const nested = data?.data ?? data;
    this.eventchecklistresponseid =
      nested?.eventchecklistresponseid ||
      nested?.eventchecklistresponse_id ||
      nested?.id ||
      (typeof nested === 'object' && nested !== null
        ? (Object.entries(nested).find(([k, v]) => k.toLowerCase().endsWith('id') && typeof v === 'number')?.[1] as number ?? null)
        : null);
    console.log('🆔 Raw CREATE data keys:', nested ? Object.keys(nested) : 'null');
    console.log('🆔 Stored eventchecklistresponseid:', this.eventchecklistresponseid);

    return data;
  }

  async getEventChecklistDetail() {
    if (!this.eventchecklistresponseid) {
      console.warn('⚠️ eventchecklistresponseid not found — skipping GET');
      return null;
    }

    return this.getEventChecklistDetailById(this.eventchecklistresponseid);
  }

  async getEventChecklistDetailById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklistresponses/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);

    if (!result.ok) {
      return result.body;
    }

    return Array.isArray(result.body) ? result.body[0] : result.body;
  }

  async updateEventChecklistDetail(payload: any) {
    if (!this.eventchecklistresponseid) {
      console.warn('⚠️ eventchecklistresponseid not found — skipping UPDATE');
      return null;
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklistresponses/${this.eventchecklistresponseid}`,
      { headers, data: payload }
    );

    return await this.handleResponse(response, 'UPDATE');
  }

  async deleteEventChecklistDetailById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklistresponses/${id}`,
      { headers }
    );

    return await this.handleResponseSafe(response);
  }

  async searchEventChecklistDetails(filter: string, ipp: number = 25, page: number = 1) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklistresponse`,
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
