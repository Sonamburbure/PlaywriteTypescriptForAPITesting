import { request, expect, APIRequestContext } from '@playwright/test';
import { BASE_API_URL, LOGON_AS } from '../utils/constants.js';
import { getAuthToken, getTenantPath } from '../utils/tokenStore.js';

export class SubsidiaryApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createSubsidiary(payload: any) {
    await this.init();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${getTenantPath()}/api/${LOGON_AS}/customer`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}
