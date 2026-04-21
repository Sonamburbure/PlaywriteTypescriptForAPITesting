import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- QUESTION BANK -------- */

const CHECKLIST_QUESTIONS = [
  'Is the venue setup completed as per the event requirements?',
  'Are all required staff members present and assigned roles?',
  'Has the equipment been checked and verified for functionality?',
  'Are all safety protocols reviewed and implemented?',
  'Is the bar setup completed and ready for service?',
  'Have all inventory items been received and verified?',
  'Is the event area clean and prepared for guests?',
  'Are all necessary permissions and approvals in place?',
  'Has the checklist been reviewed by the event supervisor?',
  'Are backup arrangements available in case of contingencies?'
];

/* -------- DROPDOWN VALUES -------- */

const DROPDOWN_OPTIONS = [
  'Yes,No',
  'Completed,Pending',
  'Approved,Rejected',
  'Available,Not Available'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Checklist Question', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic logical question
  const questionName = getRandom(CHECKLIST_QUESTIONS);

  const payload = {
    checklistmasterquestion_num: "00000000000",
    custom: {
      checklistmasterquestion_name: questionName,

      related_checklistmaster: 9, // ⚠️ must exist

      checklistmasterquestion_question_type: 803,
      checklistmasterquestion_dropdown_values: getRandom(DROPDOWN_OPTIONS),

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/checklistmasterquestion`,
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
    throw new Error(`❌ Checklist Question API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Checklist Question Response:', responseBody);

  expect(responseBody).toBeTruthy();

});