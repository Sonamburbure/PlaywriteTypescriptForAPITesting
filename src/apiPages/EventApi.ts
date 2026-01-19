import { APIRequestContext, expect } from '@playwright/test';
import {
  getTenantPath,
  getLogonAs,
  getAuthToken,
} from '../utils/tokenstore';

export class EventApi {
  constructor(private request: APIRequestContext) {}

  async createEvent(payload: any) {
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();
    const token = getAuthToken();

    expect(tenantPath).toBeTruthy();
    expect(logonAs).toBeTruthy();
    expect(token).toBeTruthy();

    const response = await this.request.post(
      `https://stage-api.automateevents.com/${tenantPath}/api/${logonAs}/event`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
