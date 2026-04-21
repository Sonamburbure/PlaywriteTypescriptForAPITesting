import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Segment1 TUOM', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  const dateTime = formatDateTime(now);

  const payload = {
    segment1tuom_num: "00000000000",
    custom: {
      related_segment1: 211, // ⚠️ ensure this ID exists

      segment1tuom_tuom: 540,

      hours_included: "8",
      min_time_uom: "1",
      max_time_uom: "1",
      block_quantity_time_uom: "1",

      decimal_places_tuom_quantity: "1",
      buffer_tuom_quantity_before_event: "1",
      buffer_tuom_quantity_after_event: "1",

      ownerid: 18,
      createtime: dateTime,
      modifiedtime: dateTime,

      assign_to: "Sonam Burbure" // ⚠️ if error → use 18
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/segment1tuom`,
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

  console.log('📩 Response:', responseBody);

  if (!response.ok()) {
    throw new Error(`❌ Segment1 TUOM API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Segment1 TUOM Response:', responseBody);

  expect(responseBody).toBeTruthy();

});