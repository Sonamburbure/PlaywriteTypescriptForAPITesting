import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const PRODUCT_TYPES = [
  'Juice',
  'Beverage',
  'Energy Drink',
  'Soft Drink',
  'Mixer',
  'Syrup'
];

const SUPPLIER_TYPES = [
  'Supplier',
  'Wholesale Supplier',
  'Distributor',
  'Vendor',
  'Trading Co.',
  'Beverage Supplier'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Product Vendor', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic vendor name
  const vendorName = `${getRandom(PRODUCT_TYPES)} ${getRandom(SUPPLIER_TYPES)}_${Date.now()}`;

  const payload = {
    productvendor_num: "00000000000",
    custom: {
      productvendor_name: vendorName,

      related_product: 361, // ⚠️ must exist
      related_supplier: 258, // ⚠️ must exist

      vendor_ref: `REF_${Date.now()}`,

      case_size: "5",
      min_case_count: "5",

      pricing_per_case: "50.00",

      purchase_vat: "168",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/productvendor`,
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
    throw new Error(`❌ Product Vendor API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Product Vendor Response:', responseBody);

  expect(responseBody).toBeTruthy();

});