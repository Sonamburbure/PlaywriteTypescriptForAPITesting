import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Segment1', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  const dateTime = formatDateTime(now);

  // 🔥 Dynamic name
  const segmentName = `Fruit Juice_${Date.now()}`;

  const payload = {
    segment1_num: "00000000000",
    custom: {
      segment1_name: segmentName,
      segment_type: 532,
      cost_type: 535,
      serial_lot_control: 550,
      related_unitofmeasure: 15,
      segment1_consumable_uom: 527,

      ownerid: 18,
      createtime: dateTime,
      modifiedtime: dateTime,

      assign_to: "Sonam Burbure" // ⚠️ if error → use 6 or 18
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/segment1`,
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
    throw new Error(`❌ Segment1 API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Segment1 Response:', responseBody);

  expect(responseBody).toBeTruthy();

});