import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- NAME PARTS -------- */

const EQUIPMENT_PREFIX = [
  'Premium',
  'Standard',
  'Heavy Duty',
  'Compact',
  'Professional'
];

const EQUIPMENT_TYPES = [
  'Bar Counter',
  'Ice Machine',
  'Serving Table',
  'Cocktail Station',
  'Glass Rack'
];

const SUPPLIER_TYPES = [
  'Primary Supplier',
  'Backup Supplier',
  'Local Vendor',
  'Preferred Supplier',
  'Wholesale Supplier'
];

/* -------- DESCRIPTIONS -------- */

const VENDOR_REFS = [
  'REF-A1',
  'REF-B2',
  'REF-C3',
  'REF-D4',
  'REF-E5'
];

const PRICING_VALUES = ['25.00', '50.00', '75.00', '100.00'];

/* -------- UTILS -------- */

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Equipment Vendor', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();
  const dateTime = formatDateTime(now);

  // 🔥 Dynamic vendor name (clean & professional)
  const vendorName = `${getRandom(EQUIPMENT_PREFIX)} ${getRandom(EQUIPMENT_TYPES)} ${getRandom(SUPPLIER_TYPES)}_${Date.now()}`;

  const payload = {
    equipmentvendor_num: "00000000000",
    custom: {
      equipmentvendor_name: vendorName,

      related_equipmentcosting: 13, // ⚠️ must exist
      related_supplier: 258,        // ⚠️ must exist

      equipmentvendor_vendorref: getRandom(VENDOR_REFS),

      equipmentvendor_priority: "first",
      equipmentvendor_min_qty: "1.00",
      equipmentvendor_min_time_uom: "1.00",

      equipmentvendor_pricing_time_uom: getRandom(PRICING_VALUES),

      related_steprate: 10, // ⚠️ must exist
      equipmentvendor_purchasevat: 570,

      equipmentvendor_breakage_cost: "2.00",

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
    `${BASE_API_URL}/${tenant}/api/${logonAs}/equipmentvendor`,
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
    throw new Error(`❌ Equipment Vendor API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Equipment Vendor Response:', responseBody);

  expect(responseBody).toBeTruthy();

});