import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- EQUIPMENT NAME PARTS -------- */

const EQUIPMENT_PREFIX = [
  'Premium',
  'Standard',
  'Heavy Duty',
  'Compact',
  'Professional',
  'Deluxe'
];

const EQUIPMENT_TYPES = [
  'Bar Counter',
  'Ice Machine',
  'Serving Table',
  'Glass Rack',
  'Cocktail Station',
  'Cooling Unit'
];

const EQUIPMENT_SIZE = [
  'Single Unit',
  'Double Unit',
  'Large',
  'Portable',
  'Industrial'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Equipment', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic professional equipment name (LIKE PRODUCT)
  const equipmentName = `${getRandom(EQUIPMENT_PREFIX)} ${getRandom(EQUIPMENT_TYPES)} ${getRandom(EQUIPMENT_SIZE)}_${Date.now()}`;

  const payload = {
    equipment_num: "00000000000",
    custom: {
      equipment_name: equipmentName,

      equipment_category: "1106",
      equipment_subcategory: 1134,
      equipment_status: 564,

      related_segment1: 157,
      related_unitofmeasure: 185,

      equipment_salesvat: 566,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/equipment`,
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
    throw new Error(`❌ Equipment API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Equipment Response:', responseBody);

  expect(responseBody).toBeTruthy();

});