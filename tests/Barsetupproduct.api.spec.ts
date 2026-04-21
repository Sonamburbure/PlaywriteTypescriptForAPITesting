import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const PRODUCT_TYPE = [
  'Beverage',
  'Soft Drink',
  'Juice',
  'Mixer',
  'Energy Drink'
];

const PRODUCT_USAGE = [
  'Consumption',
  'Service',
  'Stock',
  'Distribution'
];

const CONTEXT = [
  'Event',
  'Bar Setup',
  'Service',
  'Operational'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Bar Setup Product', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const productName = `${getRandom(CONTEXT)} ${getRandom(PRODUCT_TYPE)} ${getRandom(PRODUCT_USAGE)}`;

  const payload = {
    barsetupproduct_num: "00000000000",
    custom: {
      barsetupproduct_name: productName,

      related_barsetup: 60,
      related_segment1: 275,
      related_segment2: 54,
      related_unitofmeasure: 186,
      barsetupproduct_consumption_uom: 527,
      barsetupproduct_fixed_qty: "4",
      barsetupproduct_min: 0,
      barsetupproduct_max: 0,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/barsetupproduct`,
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
    throw new Error(`❌ Bar Setup Product API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Bar Setup Product Response:', responseBody);

  expect(responseBody).toBeTruthy();

});