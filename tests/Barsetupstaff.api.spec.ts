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
  'Support Staff',
  'Event Supervisor',
  'Bar Manager'
];

const SERVICE_TYPE = [
  'Bar Service',
  'Guest Service',
  'Event Execution',
  'Operational Support',
  'Service Setup'
];

const EVENT_CONTEXT = [
  'Wedding',
  'Corporate Event',
  'Reception',
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

test('API only: Create Bar Setup Staff', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved
  const staffName = `${getRandom(EVENT_CONTEXT)} ${getRandom(STAFF_ROLE)} ${getRandom(SERVICE_TYPE)}`;

  const payload = {
    barsetupstaff_num: "00000000000",
    custom: {
      barsetupstaff_name: staffName,

      related_barsetup: 66,
      related_segment1: 409,
      related_segment2: 79,
      related_unitofmeasure: 182,
      barsetupstaff_consumption_uom: "528",
      barsetupstaff_fixed_qty: "6",
      barsetupstaff_min: 0,
      barsetupstaff_max: 0,
      barsetupstaff_time_uom: 540,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/barsetupstaff`,
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
    throw new Error(`❌ Bar Setup Staff API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Bar Setup Staff Response:', responseBody);

  expect(responseBody).toBeTruthy();

});