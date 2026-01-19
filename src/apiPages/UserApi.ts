import { APIRequestContext, expect } from '@playwright/test';

export class UserApi {
  constructor(private request: APIRequestContext) {}

  async login(email: string, password: string, tenantName: string) {
    const response = await this.request.post(
      'https://stage-api.automateevents.com/api/login',
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: {
          email,                // ✅ must match backend
          password,             // ✅ encrypted password
          tenant_name: tenantName, // ✅ dynamic tenant
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // ✅ Validate response (helps debug 401/undefined issues)
    expect(body.token).toBeTruthy();
    expect(body.tenant_cname).toBeTruthy();
    expect(body.logon_as).toBeTruthy();

    return {
      token: body.token,
      tenantCname: body.tenant_cname,
      logonAs: body.logon_as,
    };
  }
}
