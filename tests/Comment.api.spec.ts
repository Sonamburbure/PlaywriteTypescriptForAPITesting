import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Comment', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const payload = {
    comment_num: '00000000000',
    custom: {
      comment: `hiinpx${Date.now()}`,   // dynamic
      module_comment: 'hello',
      ownerid: 18,
      assign_to: 'Sonam Burbure'   // ✅ FIXED
    },
    source: 'web',
    status: '1'
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/comment`,
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

  console.log('✅ Create Comment Response:', responseBody);

  // ❌ Fail if API call fails
  if (!response.ok()) {
    throw new Error(`❌ Comment API failed: ${JSON.stringify(responseBody)}`);
  }

  // 🔥 Correct validation (handles undefined case)
  if (responseBody.error_msg) {
    throw new Error(`❌ Validation Error: ${JSON.stringify(responseBody.error_msg)}`);
  }

  // ✅ Basic validation
  expect(responseBody).toBeTruthy();

});