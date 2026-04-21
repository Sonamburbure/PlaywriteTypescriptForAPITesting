import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const STAFF_LEVEL = [
  'Senior',
  'Junior',
  'Experienced',
  'Certified',
  'Professional'
];

const STAFF_ROLE = [
  'Bartender',
  'Service Staff',
  'Event Supervisor',
  'Support Staff',
  'Floor Manager'
];

const PRICING_TYPE = [
  'Standard Pricing',
  'Event Pricing',
  'Weekend Pricing',
  'Holiday Pricing',
  'Flexible Pricing'
];

/* -------- PRICING VALUES -------- */

const PRICING_VALUES = ['1.00', '2.00', '5.00', '10.00'];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Staff Vendor Price', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Clean logical name
  const priceName = `${getRandom(STAFF_LEVEL)} ${getRandom(STAFF_ROLE)} ${getRandom(PRICING_TYPE)}`;

  const payload = {
    staffvendorprice_num: "00000000000",
    custom: {
      staffvendorprice_name: priceName,

      related_staffvendor: 11, // ⚠️ must exist

      staffvendorprice_venue_group: 599,

      staffvendorprice_pricing_time_uom: getRandom(PRICING_VALUES),

      related_steprate: 10, // ⚠️ must exist
      staffvendorprice_purchasevat: 601,

      staffvendorprice_odd_hours_charges: "1",
      staffvendorprice_holiday_charges: "1",
      staffvendorprice_weekend_charges: "1",

      ownerid: 18,
      createtime: dateTime,
      modifiedtime: dateTime,

      assign_to: "Sonam Burbure" // ⚠️ if error → use 18
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/staffvendorprice`,
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
    throw new Error(`❌ Staff Vendor Price API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Staff Vendor Price Response:', responseBody);

  expect(responseBody).toBeTruthy();

});