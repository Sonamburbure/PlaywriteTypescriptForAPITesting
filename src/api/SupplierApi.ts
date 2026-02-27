import { expect, APIRequestContext } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';

export class SupplierApi {
  constructor(private apiContext: APIRequestContext) {}

  /**
   * CREATE Supplier
   */
  async createSupplier(payload: any) {
    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    expect(token, 'Auth token missing').toBeTruthy();
    expect(tenantPath, 'Tenant path missing').toBeTruthy();
    expect(logonAs, 'LogonAs missing').toBeTruthy();

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/supplier`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok(), 'Supplier create API failed').toBeTruthy();
    return await response.json();
  }

  /**
   * GET Supplier by ID
   */
  async getSupplierById(supplierId: number) {
    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    expect(token, 'Auth token missing').toBeTruthy();
    expect(tenantPath, 'Tenant path missing').toBeTruthy();
    expect(logonAs, 'LogonAs missing').toBeTruthy();

    const response = await this.apiContext.get(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/supplier/${supplierId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok(), 'Supplier GET API failed').toBeTruthy();
    return await response.json();
  }
}
