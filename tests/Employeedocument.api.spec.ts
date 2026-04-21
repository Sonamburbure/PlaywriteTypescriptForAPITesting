import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Employee Document', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  // Optional: make name dynamic
  const docName = `emp_${Date.now()} /Identity Proof`;

  const payload = {
    employeedocument_num: '00000000000',
    custom: {
      employeedocument_name: docName,
      related_employee: 4,
      employeedocument_visibility: '815',
      employeedocument_type: 786,
      employeedocument_staus: '792',

      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: 'Sonam Burbure' // ⚠️ if error → use 18
    },
    source: 'web',
    status: '1'
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/employeedocument`,
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

  if (!response.ok()) {
    throw new Error(`❌ Employee Document API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Employee Document Response:', responseBody);

  expect(responseBody).toBeTruthy();

});