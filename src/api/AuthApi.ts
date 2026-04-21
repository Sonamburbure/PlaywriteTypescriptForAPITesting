import { APIRequestContext } from '@playwright/test';

export class AuthApi {
  private apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  /* ================= LOGIN ================= */
  async login(email: string, password: string, tenant_name: string) {
    const payload = {
      email: email.trim(),
      password: password.trim(),
      tenant_name: encodeURIComponent(tenant_name.trim()), // ✅ safe encoding
    };

    console.log('📤 FINAL PAYLOAD:', payload);

    const response = await this.apiContext.post(
      `${process.env.BASE_API_URL}/api/login`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': process.env.BASE_UI_URL || '',
          'Referer': process.env.BASE_UI_URL || '',
          'x-automate-secret': process.env.AUTOMATE_SECRET!, // ✅ required secret
        },
        data: payload,
      }
    );

    const text = await response.text();
    console.log('🔍 LOGIN RESPONSE:', text);

    if (!response.ok()) {
      throw new Error(`❌ API Login failed: ${response.status()} \n${text}`);
    }

    return JSON.parse(text);
  }

  /* ================= FETCH TENANTS ================= */
  async fetchTenantOptions(token: string) {
    const response = await this.apiContext.get(
      `${process.env.BASE_API_URL}/api/tenant/options`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-automate-secret': process.env.AUTOMATE_SECRET!,
        },
      }
    );

    const body = await response.json();

    if (!response.ok()) {
      throw new Error(
        `❌ Fetch tenant failed: ${response.status()} ${JSON.stringify(body)}`
      );
    }

    return body.data || [];
  }
}