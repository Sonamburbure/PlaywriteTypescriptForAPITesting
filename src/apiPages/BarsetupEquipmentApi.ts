import { APIRequestContext, expect } from '@playwright/test';
import {
  getTenantPath,
  getLogonAs,
  getAuthToken,
} from '../utils/tokenstore';

export class BarSetupEquipmentApi {
  constructor(private request: APIRequestContext) {}

  async addEquipment(payload: any) {
    const response = await this.request.post(
      `https://stage-api.automateevents.com/${getTenantPath()}/api/${getLogonAs()}/barsetupequipment`,
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
