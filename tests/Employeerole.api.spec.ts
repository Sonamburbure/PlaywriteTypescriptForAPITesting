import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Employee Role', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  const payload = {
    employeerole_num: "00000000000",
    source: "web",
    status: "1",
    custom: {
      employeerole_name: `Supervise_${Date.now()}`,
      related_employee: 12,

      employeerole_eff_start_date: "2026-04-03",
      employeerole_eff_end_date: "2026-04-04",

      related_staffcosting: 25,

      employeerole_venue_group: [585],

      employeerole_pricing_time_uom: "500.00",
      related_steprate: 12,

      employeerole_odd_hours_charges: "1",
      employeerole_holiday_charges: "1",
      employeerole_weekend_charges: "1",

      employeerole_inc_holiday_pay: [587],
      employeerole_percent_holiday_pay: "3",

      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: "Sonam Burbure" // ⚠️ if error → use 18
    }
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/employeerole`,
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
    throw new Error(`❌ Employee Role API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Employee Role Response:', responseBody);

  expect(responseBody).toBeTruthy();

});