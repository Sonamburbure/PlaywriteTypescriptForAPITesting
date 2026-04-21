import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Sales Target', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const payload = {
    salestarget_num: '00000000000',
    custom: {
      sales_person: '18',
      sales_target: '5000000',
      ownerid: 18,
      assign_to: 'Sonam Burbure',   // ✅ FIXED (use ID, not name)
    },
    source: 'web',
    status: '1'
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/salestarget`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-automate-secret': process.env.AUTOMATE_SECRET!
      },
      data: payload
    }
  );

  const responseBody = await response.json();

  console.log('✅ Create Sales Target Response:', responseBody);

  // ❌ Fail if API fails
  if (!response.ok()) {
    throw new Error(`❌ Sales Target API failed: ${JSON.stringify(responseBody)}`);
  }

  // 🔥 Handle validation errors safely
  if (responseBody.error_msg) {
    throw new Error(`❌ Validation Error: ${JSON.stringify(responseBody.error_msg)}`);
  }

  // ✅ Validate response
  const salesTarget = Array.isArray(responseBody)
    ? responseBody[0]
    : responseBody;

  expect(salesTarget).toBeTruthy();
  expect(salesTarget.salestargetid).toBeTruthy();
  expect(typeof salesTarget.salestargetid).toBe('number');

  console.log('🎯 Created Sales Target ID:', salesTarget.salestargetid);

});