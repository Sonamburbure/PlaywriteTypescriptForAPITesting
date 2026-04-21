import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Employee Availability', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  const payload = {
    employeeavailability_num: "00000000000",
    custom: {
      employeeavailability_name: `emp_${Date.now()} /Confirmed`,
      related_event: 254,
      related_employee: 10,
      employeeavailability_date: "2026-04-04",
      employeeavailability_staus: "706",

      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: "Sonam Burbure" // ⚠️ if error → use 18
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/employeeavailability`,
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
    throw new Error(`❌ Employee Availability API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Employee Availability Response:', responseBody);

  expect(responseBody).toBeTruthy();

});