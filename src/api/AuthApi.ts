import { APIRequestContext } from '@playwright/test';

export class AuthApi {
  fetchTenantOptions() {
    throw new Error('Method not implemented.');
  }
  private apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  async login(email: string, password: string) {
    const response = await this.apiContext.post(
      'https://prod-api.automateevents.com/api/login',
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
}
