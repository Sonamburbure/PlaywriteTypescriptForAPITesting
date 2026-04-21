import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- COSTING NAME PARTS -------- */

const COSTING_TYPES = [
  'Standard Costing',
  'Average Costing',
  'Bulk Costing',
  'Event Costing',
  'Inventory Costing',
  'Warehouse Costing'
];

const COSTING_LEVELS = [
  'Standard',
  'Premium',
  'Basic',
  'Wholesale',
  'Retail'
];

/* -------- COST VALUES -------- */

const COST_VALUES = ['2.00', '3.50', '5.00', '7.25', '10.00'];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Product Costing', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic costing name
  const costingName = `${getRandom(COSTING_TYPES)} / ${getRandom(COSTING_LEVELS)}_${Date.now()}`;

  const cost = getRandom(COST_VALUES);

  const payload = {
    productcosting_num: "00000000000",
    custom: {
      productcosting_name: costingName,

      related_product: 421, // ⚠️ must exist

      productcosting_priority: "first",

      standardcost: cost,
      weighted_avg_cost: cost,

      costing_method: 551,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/productcosting`,
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
    throw new Error(`❌ Product Costing API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Product Costing Response:', responseBody);

  expect(responseBody).toBeTruthy();

});