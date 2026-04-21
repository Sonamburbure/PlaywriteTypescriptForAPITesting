import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- RATE VALUES -------- */

const RATE_VALUES = ['5', '7.5', '10', '12', '15'];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Step Rate Detail', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // 🔥 Dynamic values
  const rate = getRandom(RATE_VALUES);

  const payload = {
    stepratedetail_num: "00000000000",
    custom: {
      related_steprate: 16, // ⚠️ must exist

      stepratedetail_start: `${currentYear}`,
      stepratedetail_end: `${nextYear}`,

      stepratedetail_rate_per_tuom: rate,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/stepratedetail`,
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
    throw new Error(`❌ Step Rate Detail API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Step Rate Detail Response:', responseBody);

  expect(responseBody).toBeTruthy();

});