import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- PROFESSIONAL TRAINING NAMES -------- */

const TRAINING_NAMES = [
  'Corporate Excellence Training',
  'Leadership Development Program',
  'Advanced Customer Service Training',
  'Workplace Compliance Training',
  'Health & Safety Certification',
  'Operational Efficiency Workshop',
  'Team Management Training',
  'Business Communication Skills',
  'Professional Development Program',
  'Sales Performance Enhancement'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Employee Training', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const trainingName = `${getRandom(TRAINING_NAMES)}_${Date.now()}`;

  const payload = {
    employeetraining_num: "00000000000",
    custom: {
      employeetraining_name: trainingName,

      related_employee: 11,
      related_training: 4,

      employeetraining_date: "2026-04-03",
      employeetraining_valid_upto: "2026-04-09",
      employeetraining_status: "798",
      employeetraining_accepted_on: "2026-04-09",

      employeetraining_trainer_name: "Emma",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/employeetraining`,
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
    throw new Error(`❌ Employee Training API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Employee Training Response:', responseBody);

  expect(responseBody).toBeTruthy();

});