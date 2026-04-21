import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const BAR_TYPE = [
  'Main Bar',
  'Cocktail Bar',
  'Service Bar',
  'Premium Bar',
  'VIP Bar'
];

const BAR_STYLE = [
  'Classic Setup',
  'Modern Setup',
  'Luxury Setup',
  'Compact Setup',
  'Outdoor Setup'
];

const EVENT_CONTEXT = [
  'Wedding',
  'Corporate Event',
  'Private Party',
  'Reception',
  'Celebration'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Venue Bar', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Logical bar name
  const barName = `${getRandom(EVENT_CONTEXT)} ${getRandom(BAR_TYPE)} ${getRandom(BAR_STYLE)}`;

  const payload = {
    venuebar_num: "00000000000",
    custom: {
      venuebar_name: barName,

      related_venue: 340,
      related_barsetup: 40,
      venuebar_addonbarsetup: 4,
      related_eventmenu: 1,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/venuebar`,
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
    throw new Error(`❌ Venue Bar API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Venue Bar Response:', responseBody);

  expect(responseBody).toBeTruthy();

});