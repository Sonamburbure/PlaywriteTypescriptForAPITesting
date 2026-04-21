import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- PROFESSIONAL TITLES -------- */

const STEP_RATE_TITLES = [
  'Standard Hourly Rate',
  'Weekend Premium Rate',
  'Holiday Special Rate',
  'Night Shift Rate',
  'Overtime Rate',
  'Event Staff Rate',
  'Senior Staff Rate',
  'Temporary Staff Rate',
  'Peak Hours Rate',
  'Contractor Rate'
];

/* -------- LOGICAL DESCRIPTIONS -------- */

const STEP_RATE_DESCRIPTIONS = [
  'Applicable for standard working hours under normal conditions.',
  'Used for staff working during weekends with additional compensation.',
  'Applicable during public holidays with premium pricing applied.',
  'Used for late night or overnight shifts.',
  'Applied when working hours exceed regular shift duration.',
  'Standard rate for event-based staffing operations.',
  'Applicable for experienced or senior-level staff.',
  'Used for temporary or short-term staff assignments.',
  'Applied during peak business hours with higher demand.',
  'Rate defined for third-party or contract-based staff.'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Step Rate', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic values
  const stepRateTitle = `${getRandom(STEP_RATE_TITLES)}_${Date.now()}`;
  const stepRateDescription = getRandom(STEP_RATE_DESCRIPTIONS);

  const payload = {
    steprate_num: "00000000000",
    custom: {
      steprate_name: stepRateTitle,
      steprate_description: stepRateDescription,

      steprate_tuom: 540,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/steprate`,
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
    throw new Error(`❌ Step Rate API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Step Rate Response:', responseBody);

  expect(responseBody).toBeTruthy();

});