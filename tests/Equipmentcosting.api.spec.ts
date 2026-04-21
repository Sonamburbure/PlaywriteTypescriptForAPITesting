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
  'Cocktail Station',
  'Glass Rack',
  'Cooling Unit'
];

const COSTING_TYPES = [
  'Daily Cost',
  'Hourly Cost',
  'Event Cost',
  'Rental Cost',
  'Standard Cost'
];

/* -------- DESCRIPTION -------- */

const COSTING_DESCRIPTIONS = [
  'Standard costing applied for regular equipment usage.',
  'Optimized costing for event-based equipment deployment.',
  'Calculated rental cost for short-term equipment usage.',
  'Hourly costing defined for flexible operational needs.',
  'Baseline cost maintained for inventory valuation.'
];

/* -------- COST VALUES -------- */

const COST_VALUES = ['0.00', '1.50', '2.00', '5.00', '10.00'];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Equipment Costing', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic costing name (LIKE PRODUCT)
  const costingName = `${getRandom(EQUIPMENT_PREFIX)} ${getRandom(EQUIPMENT_TYPES)} ${getRandom(COSTING_TYPES)}_${Date.now()}`;

  const cost = getRandom(COST_VALUES);

  const payload = {
    equipmentcosting_num: "00000000000",
    custom: {
      equipmentcosting_name: costingName,

      related_equipment: 122, // ⚠️ must exist

      equipmentcosting_tuom: 540,
      equipmentcosting_priority: "first",

      equipmentcosting_std_cost_tuom: cost,
      equipmentcosting_avg_cost_tuom: cost,

      equipmentcosting_costing_method: 568,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/equipmentcosting`,
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
    throw new Error(`❌ Equipment Costing API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Equipment Costing Response:', responseBody);

  expect(responseBody).toBeTruthy();

});