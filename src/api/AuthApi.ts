import { APIRequestContext, expect } from '@playwright/test';

export class AuthApi {

  private apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  async login(email: string, password: string) {
    const response = await this.apiContext.post(
      `${process.env.BASE_API_URL}/api/login`,
      {
        data: { email, password },
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok()) {
      throw new Error(
        `Login failed: ${response.status()} ${response.statusText()}`
      );
    }

    return response;
  }

  async fetchTenantOptions(token: string) {

    const response = await this.apiContext.get(
      `${process.env.BASE_API_URL}/api/tenant/options`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    return body.data || [];
  }
}