import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';
import { BASE_API_URL } from '../utils/constants.js';
import type { APIRequestContext } from '@playwright/test';

export class ContactApi {
  private apiContext: APIRequestContext;
 private contactId: number | null = null;
  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  async Contact(payload: any) {
    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    if (!token || !tenantPath || !logonAs) {
      throw new Error('Missing authentication token, tenant path, or logonAs value.');
    }

    const response = await this.apiContext.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/contact`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        
          'x-automate-secret': process.env.AUTOMATE_SECRET!
        },
        data: payload,
        }
    );

  const responseBody = await response.json();

    if (!response.ok()) {
      throw new Error(
        `❌ contact API failed: ${response.status()} \n${JSON.stringify(responseBody)}`
      );
    }
const data=Array.isArray(responseBody)?responseBody[0]:responseBody;
  this.contactId = data?.contactid || data?.contact_id || data?.id;

    console.log("🆔 Stored contactId:", this.contactId);

    return data;
  }

 async getAccount() {
    if (!this.contactId) {
      throw new Error('❌ contactId not found. Call createContact first.');
    }
  const token =getAuthToken();
  const tenantPath=getTenantPath();
  const LogonAs=getLogonAs();
  
  const response =await this.apiContext.get(
    `${BASE_API_URL}/${tenantPath}/api/${LogonAs}/contact/${this.contactId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      
      
        'x-automate-secret': process.env.AUTOMATE_SECRET!
    }}
  );
  const responseBody = await response.json();

if (!response.ok()) {
  throw new Error(
    `❌ GET contact API failed: ${response.status()} \n${JSON.stringify(responseBody)}`
  );
}
const data=Array.isArray(responseBody)?responseBody[0]:responseBody;
return data;

 }}