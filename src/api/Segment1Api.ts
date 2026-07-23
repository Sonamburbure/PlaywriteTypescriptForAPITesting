import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export class Segment1Api {
  private apiContext: APIRequestContext;
  private segment1id: number | null = null;

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

  async createSegment1(payload: any) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment1`,
      { headers, data: payload }
    );

    const data = await this.handleResponse(response, 'CREATE');

    if (data?.error_msg) {
      const errMsg = JSON.stringify(data.error_msg);
      const isLockTimeout = errMsg.includes('1205') || errMsg.includes('Lock wait timeout');

      if (isLockTimeout) {
        // Record was inserted (status 201) but the audit UPDATE timed out.
        // Search for the just-created record instead of retrying the whole insert.
        const name = payload?.custom?.segment1_name;
        if (name) {
          await new Promise(r => setTimeout(r, 1000));
          const search = await this.searchSegment1s(`segment1_name=${name}`);
          const existing = search?.data?.[0];
          if (existing?.segment1id) {
            console.log(`  ⚠️  Lock timeout on audit; found created record: ${existing.segment1id}`);
            this.segment1id = existing.segment1id;
            return existing;
          }
        }
      }

      throw new Error(`❌ CREATE failed (API error): ${JSON.stringify(data.error_msg)}`);
    }

    this.segment1id = data?.segment1id || data?.segment1_id || data?.id;
    console.log('🆔 Stored segment1id:', this.segment1id);

    return data;
  }

  async getSegment1() {
    if (!this.segment1id) {
      throw new Error('❌ segment1id not found. Call createSegment1 first.');
    }

    return this.getSegment1ById(this.segment1id);
  }

  async getSegment1ById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment1s/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);

    if (!result.ok) {
      return result.body;
    }

    return Array.isArray(result.body) ? result.body[0] : result.body;
  }

  async updateSegment1(payload: any) {
    if (!this.segment1id) {
      throw new Error('❌ segment1id not found. Call createSegment1 first.');
    }

    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.put(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment1s/${this.segment1id}`,
      { headers, data: payload }
    );

    const result = await this.handleResponseSafe(response);
    console.log(`📡 UPDATE Status: ${result.status}`);
    console.log(`📩 UPDATE Response:`, result.body);
    return result;
  }

  async deleteSegment1ById(id: number) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.delete(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment1s/${id}`,
      { headers }
    );

    const result = await this.handleResponseSafe(response);
    console.log(`📡 DELETE Status: ${result.status}`);
    console.log(`📩 DELETE Response:`, result.body);
    return result;
  }

  async searchSegment1s(filter: string, ipp: number = 25, page: number = 1) {
    const { tenantPath, logonAs, headers } = this.getHeaders();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment1`,
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
