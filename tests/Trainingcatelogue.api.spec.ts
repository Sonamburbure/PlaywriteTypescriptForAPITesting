import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- UK TRAINER NAMES -------- */

const UK_FIRST_NAMES = [
  'James', 'Oliver', 'George', 'Harry', 'Noah',
  'Emily', 'Amelia', 'Olivia', 'Isla', 'Ava'
];

const UK_LAST_NAMES = [
  'Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson',
  'Davies', 'Evans', 'Thomas', 'Roberts', 'Walker'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrainerName() {
  return `${getRandom(UK_FIRST_NAMES)} ${getRandom(UK_LAST_NAMES)}`;
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Training (Dynamic Trainer Name)', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const trainerName = generateTrainerName();

  const payload = {
    training_num: "00000000000",
    custom: {
      training_name: `${trainerName} Training_${Date.now()}`, // 🔥 dynamic trainer name

      training_category: 795,
      training_url: "url",
      training_valid_for: "3.00",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/training`,
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
    throw new Error(`❌ Training API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Training Response:', responseBody);

  expect(responseBody).toBeTruthy();

});