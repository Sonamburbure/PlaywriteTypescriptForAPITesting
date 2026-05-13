import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const DRINK_TYPE = [
  'Cocktail',
  'Mocktail',
  'Soft Beverage',
  'Juice',
  'Energy Drink',
  'Mixed Beverage'
];

const SERVICE_STYLE = [
  'Service',
  'Serving',
  'Distribution',
  'Station',
  'Counter'
];

const EVENT_CONTEXT = [
  'Reception',
  'Corporate Event',
  'Wedding',
  'Private Party',
  'Celebration'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Item Served', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const itemServedName = `${getRandom(EVENT_CONTEXT)} ${getRandom(DRINK_TYPE)} ${getRandom(SERVICE_STYLE)}`;

  const payload = {
    itemserved_num: "00000000000",
    custom: {
      itemserved_name: itemServedName,

      itemserved_category: "608",
      itemserved_subcategory: 1159,
      itemserved_status: 618,
      itemserved_type: 620,
      itemserved_product_required: 621,
      itemserved_equipment_required: 623,
      itemserved_staff_required: 625,

      ownerid: 18,
      createtime: dateTime,
      modifiedtime: dateTime,

      assign_to: "Sonam Burbure"
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/itemserved`,
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
    throw new Error(`❌ Item Served API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Item Served Response:', responseBody);

  expect(responseBody).toBeTruthy();

});
