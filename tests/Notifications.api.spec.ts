import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- PROFESSIONAL HEADINGS -------- */

const NOTIFICATION_HEADINGS = [
  'Event Update',
  'Schedule Reminder',
  'Important Notice',
  'Operational Update',
  'Staff Notification',
  'Urgent Update',
  'Event Instruction',
  'Logistics Update',
  'Team Alert',
  'Final Reminder'
];

/* -------- LOGICAL DETAILS -------- */

const NOTIFICATION_DETAILS = [
  'Please review the latest updates and ensure all preparations are completed on time.',
  'Kindly be informed about the schedule changes and plan accordingly.',
  'All staff are requested to follow the updated operational guidelines.',
  'Ensure all assigned tasks are completed before the event start time.',
  'Please coordinate with your team and confirm readiness for the event.',
  'Important instructions have been updated. Kindly review and acknowledge.',
  'All members must adhere to the safety and compliance requirements.',
  'Final confirmation is required before proceeding with event execution.'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Event Notification', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const heading = `${getRandom(NOTIFICATION_HEADINGS)}_${Date.now()}`;
  const details = getRandom(NOTIFICATION_DETAILS);

  const payload = {
    eventnotification_num: "00000000000",
    custom: {
      eventnotification_name: heading,
      eventnotification_details: details,

      eventnotification_type: "810",
      eventnotification_status: "813",
      related_event: 213,

      eventnotification_sendall: false,

      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: "Sonam Burbure" // ⚠️ if error → use 18
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/eventnotification`,
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

  if (!response.ok()) {
    throw new Error(`❌ Event Notification API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Event Notification Response:', responseBody);

  expect(responseBody).toBeTruthy();

});