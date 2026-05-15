import { test, expect } from '@playwright/test';
import { StaffVendorApi } from '../src/api/StafftypevendorsApi.js';

const STAFF_LEVEL = [
  'Senior', 'Junior', 'Experienced',
  'Certified', 'Professional'
];

const STAFF_ROLE = [
  'Bartender', 'Service Staff', 'Event Supervisor',
  'Support Staff', 'Floor Manager'
];

const SUPPLIER_TYPE = [
  'Primary Supplier', 'Backup Supplier', 'Local Vendor',
  'Preferred Supplier', 'Contract Supplier'
];

const VENDOR_REFS = ['REF-S1', 'REF-S2', 'REF-S3', 'REF-S4', 'REF-S5'];

const RELATED_STAFFCOSTING_IDS = [18, 19, 20, 21, 22];
const RELATED_SUPPLIER_IDS = [258, 259, 260, 261, 262];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVendorName() {
  return `${getRandom(STAFF_LEVEL)} ${getRandom(STAFF_ROLE)} ${getRandom(SUPPLIER_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const staffVendorApi = new StaffVendorApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const vendorName = generateVendorName();
  const relatedStaffCosting = getRandom(RELATED_STAFFCOSTING_IDS);
  const relatedSupplier = getRandom(RELATED_SUPPLIER_IDS);

  const payload = {
    staffvendor_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      staffvendor_name: vendorName,
      related_staffcosting: relatedStaffCosting,
      related_supplier: relatedSupplier,
      staffvendor_vendorref: getRandom(VENDOR_REFS),
      staffvendor_priority: 'first',
      staffvendor_min_qty: '1.00',
      staffvendor_max_qty: '1.00',
      staffvendor_min_time_uom: '1.00',
      staffvendor_max_time_uom: '1.00',
      staffvendor_blockqty_time_uom: '1.00',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await staffVendorApi.createStaffVendor(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.staffvendorid).toBeDefined();
  expect.soft(createRes.staffvendor_name).toBe(vendorName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await staffVendorApi.getStaffVendor();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.staffvendorid).toBe(createRes.staffvendorid);
  expect.soft(getRes.staffvendor_name).toBe(vendorName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await staffVendorApi.searchStaffVendors(
    `staffvendor_name=${vendorName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.staffvendor_name === vendorName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.staffvendor_name = generateVendorName();
  payload.custom.staffvendor_vendorref = getRandom(VENDOR_REFS);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await staffVendorApi.updateStaffVendor(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await staffVendorApi.searchStaffVendors(
    `staffvendor_name=${payload.custom.staffvendor_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.staffvendor_name === payload.custom.staffvendor_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      staffvendor_name: generateVendorName(),
      related_staffcosting: getRandom(RELATED_STAFFCOSTING_IDS.filter(id => id !== relatedStaffCosting)),
      related_supplier: getRandom(RELATED_SUPPLIER_IDS.filter(id => id !== relatedSupplier)),
      staffvendor_vendorref: getRandom(VENDOR_REFS),
    }
  };

  const dummyRes = await staffVendorApi.createStaffVendor(dummyPayload);
  const deleteId = dummyRes.staffvendorid;

  const startDelete = Date.now();

  const deleteRes = await staffVendorApi.deleteStaffVendorById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await staffVendorApi.getStaffVendorById(deleteId);

  expect.soft(deletedCheck?.staffvendorid).toBeUndefined();
});
