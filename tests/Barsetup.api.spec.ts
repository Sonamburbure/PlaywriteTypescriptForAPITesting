import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const BAR_TYPE = [
  'Cocktail Bar',
  'Premium Bar',
  'Service Bar',
  'Mobile Bar',
  'VIP Bar'
];

const SETUP_STYLE = [
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

test('API only: Create Bar Setup', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Logical dynamic name
  const barSetupName = `${getRandom(EVENT_CONTEXT)} ${getRandom(BAR_TYPE)} ${getRandom(SETUP_STYLE)}`;

  const payload = {
    barsetup_num: "00000000000",
    custom: {
      barsetup_name: barSetupName,

      barsetup_category: 627,
      barsetup_subcategory: "",
      barsetup_sort_category: "",
      barsetup_status: 631,
      barsetup_type: 633,
      barsetup_product_required: 634,
      barsetup_equipment_required: 636,
      barsetup_staff_required: 638,

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/barsetup`,
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
    throw new Error(`❌ Bar Setup API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Bar Setup Response:', responseBody);

  expect(responseBody).toBeTruthy();

});