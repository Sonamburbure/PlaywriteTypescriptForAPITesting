import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const CHECKLIST_CATEGORY = [
  'Event Preparation',
  'Operational Readiness',
  'Service Setup',
  'Quality Assurance',
  'Pre Event Planning',
  'Execution Checklist',
  'Venue Preparation',
  'Staff Coordination'
];

const CHECKLIST_TYPE = [
  'Checklist',
  'Verification',
  'Inspection',
  'Guidelines',
  'Procedure'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Checklist Master', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Clean professional name (no numbers)
  const checklistName = `${getRandom(CHECKLIST_CATEGORY)} ${getRandom(CHECKLIST_TYPE)}`;

  const payload = {
    checklistmaster_num: "00000000000",
    custom: {
      checklistmaster_name: checklistName,

      checklistmaster_type: 800,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/checklistmaster`,
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
    throw new Error(`❌ Checklist Master API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Checklist Master Response:', responseBody);

  expect(responseBody).toBeTruthy();

});