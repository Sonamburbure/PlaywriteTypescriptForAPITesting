import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const PRODUCT_TYPE = [
  'Mocktail Mix',
  'Cocktail Base',
  'Juice Blend',
  'Soft Drink',
  'Energy Beverage',
  'Fruit Mix'
];

const USAGE_TYPE = [
  'Preparation',
  'Serving',
  'Consumption',
  'Mixing',
  'Distribution'
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

test('API only: Create Item Product', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const itemProductName = `${getRandom(EVENT_CONTEXT)} ${getRandom(PRODUCT_TYPE)} ${getRandom(USAGE_TYPE)}`;

  const payload = {
    itemproduct_num: "00000000000",
    custom: {
      itemproduct_name: itemProductName,

      related_itemserved: 49,
      related_segment1: 260,
      related_unitofmeasure: 186,
      itemproduct_consumption_uom: 527,
      itemproduct_fixed_qty: "5",
      itemproduct_min: 0,
      itemproduct_max: 0,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/itemproduct`,
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
    throw new Error(`❌ Item Product API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Item Product Response:', responseBody);

  expect(responseBody).toBeTruthy();

});