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

const SUPPLIER_TYPE = [
  'Primary Supplier',
  'Backup Supplier',
  'Local Vendor',
  'Preferred Supplier',
  'Contract Supplier'
];

/* -------- REFERENCE -------- */

const VENDOR_REFS = [
  'REF-S1',
  'REF-S2',
  'REF-S3',
  'REF-S4',
  'REF-S5'
];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Staff Vendor', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Clean dynamic vendor name
  const vendorName = `${getRandom(STAFF_LEVEL)} ${getRandom(STAFF_ROLE)} ${getRandom(SUPPLIER_TYPE)}`;

  const payload = {
    staffvendor_num: "00000000000",
    custom: {
      staffvendor_name: vendorName,

      related_staffcosting: 18, // ⚠️ must exist
      related_supplier: 258,    // ⚠️ must exist

      staffvendor_vendorref: getRandom(VENDOR_REFS),

      staffvendor_priority: "first",

      staffvendor_min_qty: "1.00",
      staffvendor_max_qty: "1.00",

      staffvendor_min_time_uom: "1.00",
      staffvendor_max_time_uom: "1.00",
      staffvendor_blockqty_time_uom: "1.00",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/staffvendor`,
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
    throw new Error(`❌ Staff Vendor API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Staff Vendor Response:', responseBody);

  expect(responseBody).toBeTruthy();

});