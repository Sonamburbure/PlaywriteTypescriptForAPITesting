import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- MENU NAME PARTS -------- */

const EVENT_TYPE = [
  'Wedding',
  'Corporate',
  'Reception',
  'Birthday',
  'Private Party'
];

const COURSE_TYPE = [
  'Starter',
  'Main Course',
  'Dessert',
  'Beverage'
];

const DISH_NAME = [
  'Cheesecake',
  'Brownie',
  'Pasta',
  'Mocktail',
  'Ice Cream'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

// 🔥 Logical Name (NO number)
function generateMenuName() {
  return `${getRandom(EVENT_TYPE)} ${getRandom(COURSE_TYPE)} ${getRandom(DISH_NAME)}`;
}

test('API only: Create Event Menu', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  const now = new Date();
  const dateTime = formatDateTime(now);

  const eventMenuName = generateMenuName();

  const payload = {
    eventmenu_num: "00000000000",
    custom: {
      eventmenu_name: eventMenuName,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/eventmenu`,
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
    throw new Error(`❌ Event Menu API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Event Menu Response:', responseBody);

  expect(responseBody).toBeTruthy();

  // Optional validation
  if (responseBody?.data?.eventmenu_name) {
    expect(responseBody.data.eventmenu_name).toContain(eventMenuName);
  }

});