import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- LOGICAL SEGMENT NAMES -------- */

const SEGMENT2_NAMES = [
  'Fresh Juices',
  'Soft Drinks',
  'Energy Beverages',
  'Dairy Products',
  'Bakery Items',
  'Snacks & Appetizers',
  'Hot Beverages',
  'Packaged Water',
  'Organic Products',
  'Frozen Items'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Segment2', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Logical + Dynamic Name
  const segment2Name = `${getRandom(SEGMENT2_NAMES)}_${Date.now()}`;

  const payload = {
    segment2_num: "00000000000",
    custom: {
      segment2_name: segment2Name,
      segment2_segment_type: 532,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/segment2`,
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
    throw new Error(`❌ Segment2 API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Segment2 Response:', responseBody);

  expect(responseBody).toBeTruthy();

});