import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const STAFF_ROLE = [
  'Bartender',
  'Serving Staff',
  'Service Crew',
  'Event Staff',
  'Bar Assistant'
];

const SERVICE_TYPE = [
  'Service',
  'Serving',
  'Execution',
  'Support',
  'Operations'
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

test('API only: Create Item Staff', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const itemStaffName = `${getRandom(EVENT_CONTEXT)} ${getRandom(STAFF_ROLE)} ${getRandom(SERVICE_TYPE)}`;

  const payload = {
    itemstaff_num: "00000000000",
    custom: {
      itemstaff_name: 'Reception Mocktail Distribution',

      related_itemserved: 49,
      related_segment1: 41,
      related_unitofmeasure: 182,
      itemstaff_consumption_uom: 527,
      itemstaff_fixed_qty: "4",
      itemstaff_min: 0,
      itemstaff_max: 0,
      itemstaff_time_uom: 540,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/itemstaff`,
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
    throw new Error(`❌ Item Staff API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Item Staff Response:', responseBody);

  expect(responseBody).toBeTruthy();

});