import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- STAFF TYPE NAME PARTS -------- */

const STAFF_PREFIX = [
  'Senior',
  'Junior',
  'Professional',
  'Certified',
  'Experienced'
];

const STAFF_ROLES = [
  'Bartender',
  'Service Staff',
  'Event Supervisor',
  'Support Staff',
  'Floor Manager'
];

const STAFF_CATEGORY = [
  'Count Based',
  'Hourly',
  'Event Based',
  'Shift Based'
];

/* -------- DESCRIPTION -------- */

const STAFF_DESCRIPTIONS = [
  'Responsible for handling assigned duties during events with efficiency and professionalism.',
  'Supports event operations by ensuring smooth service and coordination with the team.',
  'Trained staff allocated based on event requirements and service standards.',
  'Ensures timely execution of assigned responsibilities during event operations.',
  'Provides reliable service support aligned with operational and customer expectations.'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Staff Type', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic logical name (no random junk)
  const staffName = `${getRandom(STAFF_PREFIX)} ${getRandom(STAFF_ROLES)} ${getRandom(STAFF_CATEGORY)}`;

  const payload = {
    stafftype_num: "00000000000",
    custom: {
      stafftype_name: staffName,

      stafftype_category: 589,
      stafftype_subcategory: "",
      stafftype_status: 596,

      related_segment1: 289,
      related_unitofmeasure: 182,

      stafftype_priority: "first",

      // ✅ Logical description
      stafftype_description: getRandom(STAFF_DESCRIPTIONS),

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/stafftype`,
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
    throw new Error(`❌ Staff Type API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Staff Type Response:', responseBody);

  expect(responseBody).toBeTruthy();

});