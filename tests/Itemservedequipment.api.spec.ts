import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const EQUIPMENT_TYPE = [
  'Blender',
  'Shaker',
  'Serving Dispenser',
  'Cooling Unit',
  'Mixing Station',
  'Bar Counter'
];

const USAGE_TYPE = [
  'Preparation',
  'Mixing',
  'Serving',
  'Cooling',
  'Dispensing'
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

test('API only: Create Item Equipment', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const itemEquipmentName = `${getRandom(EVENT_CONTEXT)} ${getRandom(EQUIPMENT_TYPE)} ${getRandom(USAGE_TYPE)}`;

  const payload = {
    itemequipment_num: "00000000000",
    custom: {
      itemequipment_name: itemEquipmentName,

      related_itemserved: 6,
      related_segment1: 153,
      related_unitofmeasure: 185,
      itemequipment_consumption_uom: 527,
      itemequipment_fixed_qty: "5",
      itemequipment_min: 0,
      itemequipment_max: 0,
      itemequipment_time_uom: 540,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/itemequipment`,
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
    throw new Error(`❌ Item Equipment API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Item Equipment Response:', responseBody);

  expect(responseBody).toBeTruthy();

});