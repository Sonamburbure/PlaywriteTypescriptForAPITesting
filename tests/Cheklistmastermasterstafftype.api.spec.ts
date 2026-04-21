import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const STAFF_TYPE = [
  'Serving Staff',
  'Bartender',
  'Support Staff',
  'Event Supervisor',
  'Floor Manager'
];

const SERVICE_TYPE = [
  'Buffet Service',
  'Table Service',
  'Bar Service',
  'Guest Handling',
  'Food Service'
];

const CHECKLIST_TYPE = [
  'Operational Readiness Verification',
  'Service Setup Checklist',
  'Pre Event Inspection',
  'Execution Checklist',
  'Quality Assurance Checklist'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Event Checklist Staff Type', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Only name improved (same format kept)
  const checklistName = `${getRandom(STAFF_TYPE)}/${getRandom(SERVICE_TYPE)}/${getRandom(CHECKLIST_TYPE)}`;

  const payload = {
    eventcheckliststafftype_num: "00000000000",
    custom: {
      eventcheckliststafftype_name: checklistName,

      related_checklistmaster: 9,
      related_stafftype: 68,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/eventcheckliststafftype`,
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
    throw new Error(`❌ Event Checklist Staff Type API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Event Checklist Staff Type Response:', responseBody);

  expect(responseBody).toBeTruthy();

});