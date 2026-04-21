import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* 🔹 UK Names */
const UK_FIRST_NAMES = [
  'James', 'Oliver', 'Harry', 'George', 'Noah',
  'Jack', 'Leo', 'Charlie', 'Jacob', 'Alfie',
  'Emily', 'Amelia', 'Olivia', 'Isla', 'Ava'
];

const UK_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor',
  'Wilson', 'Davies', 'Evans', 'Thomas', 'Roberts'
];

function getRandom(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API only: Create Contact', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const firstName = getRandom(UK_FIRST_NAMES);
  const lastName = getRandom(UK_LAST_NAMES);

  const dateTime = new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);

  const payload = {
    contact_num: '00000000000',
    custom: {
      firstname: firstName,
      lastname: lastName,
      contact_name: `${firstName} ${lastName}`,

      ownerid: 18,
      assign_to: 'Sonam Burbure',   // ✅ fixed

      contact_phone: '07123456789',
      contact_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.com`,

      contact_address: '10 Baker Street',
      contact_city: 'London',
      contact_post_code: 'AB12 3CD',
      contact_country: 1,

      createtime: dateTime,
      modifiedtime: dateTime,
    },
    source: 'web',
    status: '1',
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/contact`,
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

  console.log('✅ Create Contact Response:', responseBody);

  if (!response.ok()) {
    throw new Error(`❌ Contact API failed: ${JSON.stringify(responseBody)}`);
  }

  // 🔥 important validation
  expect(responseBody.error_msg).toEqual({});

  expect(responseBody).toBeTruthy();
});