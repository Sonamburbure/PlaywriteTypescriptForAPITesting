import { test, expect, request } from '@playwright/test';
import { SubsidiaryApi } from '../src/api/SubsidiaryApi.js';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../src/utils/tokenStore.js';

test('API: Create Subsidiary under existing Account', async () => {
  // 🔐 Ensure auth is available from globalSetup
  expect(getAuthToken()).toBeTruthy();
  expect(getTenantPath()).toBeTruthy();
  expect(getLogonAs()).toBeTruthy();

  const apiContext = await request.newContext();

  // 🔗 Parent account details
  const parentAccountId = 383;
  const parentAccountName = 'AutoCustomer_2026-02-04';

  const payload = {
    customer_num: `SUB-${Date.now()}`,

    custom: {
      customer_name: `Subsidiary_${Date.now()}`,
      customer_phone: '12345678',
      customer_email: `sub_${Date.now()}@testmail.com`,
      customer_city: 'newTown',
      ownerid: 18,

      // 🔑 Parent linkage
      related_customerid: parentAccountId,
      assign_to: 'Sonam Burbure',
    },

    related_customer: parentAccountName,
    source: 'web',
    status: '1',
  };

  const subsidiaryApi = new SubsidiaryApi(apiContext);

  // ⚠️ METHOD NAME MUST MATCH CLASS
  const response = await subsidiaryApi.createSubsidiary(payload);

  console.log('Create Subsidiary API response:', response);

  const subsidiary = Array.isArray(response) ? response[0] : response;

  expect(subsidiary).toBeTruthy();
  expect(subsidiary.customerid).toBeTruthy();
  expect(subsidiary.related_customerid).toBe(String(parentAccountId));
});
