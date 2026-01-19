import { APIRequestContext, expect } from '@playwright/test';
import {
  getTenantPath,
  getLogonAs,
  getAuthToken,
} from '../utils/tokenstore';

export class BarSetupApi {
  constructor(private request: APIRequestContext) {}

  async createBarSetup(payload: any): Promise<string> {
    const response = await this.request.post(
      `https://stage-api.automateevents.com/${getTenantPath()}/api/${getLogonAs()}/barsetup`,
       {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    // ✅ THIS is the saved BarSetup ID
    return body.data.id;
  }
}
