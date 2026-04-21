import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- BUNDLE NAME PARTS -------- */

const BUNDLE_PREFIX = [
  'Premium',
  'Standard',
  'Deluxe',
  'Professional',
  'Essential'
];

const BUNDLE_TYPES = [
  'Bar Setup',
  'Cocktail Service Kit',
  'Event Serving Setup',
  'Beverage Station Setup',
  'Mobile Bar Kit'
];

const BUNDLE_PURPOSE = [
  'Package',
  'Bundle',
  'Setup',
  'Kit',
  'Arrangement'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Equipment Bundle', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic bundle name (NO number)
  const bundleName = `${getRandom(BUNDLE_PREFIX)} ${getRandom(BUNDLE_TYPES)} ${getRandom(BUNDLE_PURPOSE)}`;

  const payload = {
    equipmentbundle_num: "00000000000",
    custom: {
      equipmentbundle_name: bundleName,

      related_equipment: 138, // ⚠️ must exist

      equipmentbundlechildequipment_multiple_record: 138,
      equipmentbundlechildequipment_multiple_module: "equipment",

      child_product_qty: "1.00",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/equipmentbundle`,
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
    throw new Error(`❌ Equipment Bundle API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Equipment Bundle Response:', responseBody);

  expect(responseBody).toBeTruthy();

});