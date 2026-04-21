import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- PRODUCT NAME PARTS -------- */

const PRODUCT_PREFIX = [
  'Premium',
  'Classic',
  'Fresh',
  'Organic',
  'Signature',
  'Deluxe',
  'Elite',
  'Pure'
];

const PRODUCT_ITEMS = [
  'Orange Juice',
  'Apple Juice',
  'Mango Drink',
  'Mixed Fruit Juice',
  'Energy Drink',
  'Cold Coffee',
  'Lemonade',
  'Iced Tea'
];

const PRODUCT_PACK = [
  '1L Bottle',
  '2L Bottle',
  '5L Container',
  '500ml Pack',
  'Bulk Pack',
  'Family Pack'
];

/* -------- DESCRIPTION -------- */

const PRODUCT_DESCRIPTIONS = [
  'High-quality beverage product suitable for events and bulk consumption.',
  'Carefully processed drink with consistent taste and premium quality.',
  'Ideal for catering services and large-scale event operations.',
  'Prepared using quality ingredients ensuring freshness and taste.',
  'Reliable product designed for professional event usage.'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Product', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic product name
  const productName = `${getRandom(PRODUCT_PREFIX)} ${getRandom(PRODUCT_ITEMS)} ${getRandom(PRODUCT_PACK)}_${Date.now()}`;

  const payload = {
    product_num: "00000000000",
    custom: {
      product_name: productName,

      serial_batch: 207,
      product_category: "1187",
      related_segment1: 259, // ⚠️ must exist

      safety_stock: 5,
      product_subcategory: "",

      product_status: 546,
      related_unitofmeasure: 186, // ⚠️ must exist

      sales_vat: 548,
      manufacturer_name: "John",

      product_description: getRandom(PRODUCT_DESCRIPTIONS),

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/product`,
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
    throw new Error(`❌ Product API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Product Response:', responseBody);

  expect(responseBody).toBeTruthy();

});