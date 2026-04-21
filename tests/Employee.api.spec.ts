import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- UK DATA -------- */

const UK_FIRST_NAMES = [
  'James', 'Oliver', 'Harry', 'George', 'Noah',
  'Jack', 'Leo', 'Charlie', 'Jacob', 'Alfie',
  'Emily', 'Amelia', 'Olivia', 'Isla', 'Ava'
];

const UK_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor',
  'Wilson', 'Davies', 'Evans', 'Thomas', 'Roberts'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUKMobile() {
  return `07${Math.floor(100000000 + Math.random() * 900000000)}`;
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Employee (UK Random Data)', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const firstName = getRandom(UK_FIRST_NAMES);
  const lastName = getRandom(UK_LAST_NAMES);
  const mobile = generateUKMobile();
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Date.now()}@mail.com`;

  const payload = {
    employee_num: '00000000000',
    custom: {
      employee_firstname: firstName,
      employee_lastname: lastName,

      employee_eff_start_date: '2026-04-02',
      employee_eff_end_date: '2026-04-03',

      employee_address: 'South Street, London',
      employee_Mobile: mobile,
      employee_email: email,

      employee_active_status: 576,
      related_staffcosting: 18,
      employee_step: '7',
      employee_type: 581,
      employee_payment_type: 583,
      related_employee: 4,

      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: 'Sonam Burbure' // ⚠️ if error → use 18
    },
    source: 'web',
    status: '1'
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/employee`,
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
    throw new Error(`❌ Employee API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Employee Response:', responseBody);

  expect(responseBody).toBeTruthy();

});