import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext } from '@playwright/test';

export class EmployeeAvailabilityApi {
  private apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  async createEmployeeAvailability(payload: any) {
    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    if (!token || !tenantPath || !logonAs) {
      throw new Error('❌ Missing authentication token / tenant / logonAs');
    }

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/employeeavailability`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-automate-secret': process.env.AUTOMATE_SECRET!  // ✅ IMPORTANT
        },
        data: payload,
      }
    );

    const responseBody = await response.json();

    if (!response.ok()) {
      throw new Error(
        `❌ Employee Availability API failed: ${response.status()} \n${JSON.stringify(responseBody)}`
      );
    }

    return responseBody;
  }
}