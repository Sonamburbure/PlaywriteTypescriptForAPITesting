import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const STAFF_LEVEL = [
  'Senior',
  'Junior',
  'Experienced',
  'Certified',
  'Professional'
];

const STAFF_ROLE = [
  'Bartender',
  'Service Staff',
  'Event Supervisor',
  'Support Staff',
  'Floor Manager'
];

const COSTING_TYPE = [
  'Daily Rate',
  'Hourly Rate',
  'Event Rate',
  'Shift Rate'
];

/* -------- COST VALUES -------- */

const COST_VALUES = ['10.00', '15.00', '20.00', '25.00', '30.00'];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Staff Costing', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic clean name
  const costingName = `${getRandom(STAFF_LEVEL)} ${getRandom(STAFF_ROLE)} ${getRandom(COSTING_TYPE)}`;

  const payload = {
    staffcosting_num: "00000000000",
    custom: {
      staffcosting_name: costingName,

      related_stafftype: 59, // ⚠️ must exist

      staffcosting_tuom: 540,

      min_age: 18,
      max_age: 40,

      staffcosting_cost_time_uom: getRandom(COST_VALUES),

      staffcosting_costing_method: 598,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/staffcosting`,
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
    throw new Error(`❌ Staff Costing API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Staff Costing Response:', responseBody);

  expect(responseBody).toBeTruthy();

});