import { APIRequestContext, expect } from '@playwright/test';
import {
  getTenantPath,
  getLogonAs,
  getAuthToken,
} from '../utils/tokenstore';

export class BarSetupProductApi {
  constructor(private request: APIRequestContext) {}

  async addProduct(payload: any) {
    const response = await this.request.post(
      `https://stage-api.automateevents.com/${getTenantPath()}/api/${getLogonAs()}/barsetupproduct`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);

    return response.json();
  }
}
