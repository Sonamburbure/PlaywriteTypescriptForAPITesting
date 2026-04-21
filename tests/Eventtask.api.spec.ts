import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- TASK NAME PARTS -------- */

const ACTION = [
  'Prepare',
  'Arrange',
  'Verify',
  'Coordinate',
  'Finalize'
];

const AREA = [
  'Catering',
  'Guest List',
  'Venue',
  'Staff',
  'Logistics'
];

const CONTEXT = [
  'Setup',
  'Arrangement',
  'Planning',
  'Execution',
  'Checklist'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

// 🔥 Logical Task Name (NO number)
function generateTaskName() {
  return `${getRandom(ACTION)} ${getRandom(AREA)} ${getRandom(CONTEXT)}`;
}

test('API only: Create Event Task', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  const now = new Date();
  const dateTime = formatDateTime(now);

  const taskName = generateTaskName();

  const payload = {
    eventtask_num: "00000000000",
    custom: {
      eventtask_name: taskName,

      related_event: 254,
      eventtask_task_category: 640,
      eventtask_task_desciption: "Description",
      eventtask_priority: 654,
      eventtask_status: "681",
      eventtask_duedate: "2026-04-30",

      assign_to: "Sonam Burbure",
      ownerid: 18,
      createtime: dateTime,
      modifiedtime: dateTime
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/eventtask`,
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
    throw new Error(`❌ Event Task API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Event Task Response:', responseBody);

  // ✅ Basic validation
  expect(responseBody).toBeTruthy();

  // ✅ Optional validation
  if (responseBody?.data?.eventtask_name) {
    expect(responseBody.data.eventtask_name).toContain(taskName);
  }

});