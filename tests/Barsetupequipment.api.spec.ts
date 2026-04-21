import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const EQUIPMENT_TYPE = [
  'Bar Counter',
  'Serving Station',
  'Cooling Unit',
  'Dispensing Unit',
  'Storage Unit'
];

const USAGE_TYPE = [
  'Service Setup',
  'Operational Use',
  'Event Setup',
  'Preparation',
  'Execution'
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

test('API only: Create Bar Setup Equipment', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const equipmentName = `${getRandom(CONTEXT)} ${getRandom(EQUIPMENT_TYPE)} ${getRandom(USAGE_TYPE)}`;

  const payload = {
    barsetupequipment_num: "00000000000",
    custom: {
      barsetupequipment_name: equipmentName,

      related_barsetup: 60,
      related_segment1: 400,
      related_unitofmeasure: 185,
      barsetupequipment_consumption_uom: 527,
      barsetupequipment_fixed_qty: "4",
      barsetupequipment_min: 1,
      barsetupequipment_max: 2,
      barsetupequipment_time_uom: 540,
      barsetupequipment_min_uom: 1,
      barsetupequipment_max_uom: 1,
      barsetupequipment_cost_con_uom_tuom: "1.00",
      barsetupequipment_margin: "0",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/barsetupequipment`,
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
    throw new Error(`❌ Bar Setup Equipment API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Bar Setup Equipment Response:', responseBody);

  expect(responseBody).toBeTruthy();

});