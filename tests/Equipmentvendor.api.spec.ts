import { test, expect } from '@playwright/test';
import { EquipmentVendorApi } from '../src/api/EquipmentvendorsApi.js';

const EQUIPMENT_PREFIX = [
  'Premium', 'Standard', 'Heavy Duty',
  'Compact', 'Professional'
];

const EQUIPMENT_TYPES = [
  'Bar Counter', 'Ice Machine', 'Serving Table',
  'Cocktail Station', 'Glass Rack'
];

const SUPPLIER_TYPES = [
  'Primary Supplier', 'Backup Supplier', 'Local Vendor',
  'Preferred Supplier', 'Wholesale Supplier'
];

const VENDOR_REFS = ['REF-A1', 'REF-B2', 'REF-C3', 'REF-D4', 'REF-E5'];
const PRICING_VALUES = ['25.00', '50.00', '75.00', '100.00'];

const RELATED_EQUIPMENTCOSTING_IDS = [13, 14, 15, 16, 17];
const RELATED_SUPPLIER_IDS = [258, 259, 260, 261, 262];
const RELATED_STEPRATE_IDS = [10, 11, 12, 13, 14];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVendorName() {
  return `${getRandom(EQUIPMENT_PREFIX)} ${getRandom(EQUIPMENT_TYPES)} ${getRandom(SUPPLIER_TYPES)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const equipmentVendorApi = new EquipmentVendorApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const vendorName = generateVendorName();
  const relatedEquipmentCosting = getRandom(RELATED_EQUIPMENTCOSTING_IDS);
  const relatedSupplier = getRandom(RELATED_SUPPLIER_IDS);

  const payload = {
    equipmentvendor_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      equipmentvendor_name: vendorName,
      related_equipmentcosting: relatedEquipmentCosting,
      related_supplier: relatedSupplier,
      equipmentvendor_vendorref: getRandom(VENDOR_REFS),
      equipmentvendor_priority: 'first',
      equipmentvendor_min_qty: '1.00',
      equipmentvendor_min_time_uom: '1.00',
      equipmentvendor_pricing_time_uom: getRandom(PRICING_VALUES),
      related_steprate: getRandom(RELATED_STEPRATE_IDS),
      equipmentvendor_purchasevat: 570,
      equipmentvendor_breakage_cost: '2.00',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await equipmentVendorApi.createEquipmentVendor(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.equipmentvendorid).toBeDefined();
  expect.soft(createRes.equipmentvendor_name).toBe(vendorName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await equipmentVendorApi.getEquipmentVendor();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.equipmentvendorid).toBe(createRes.equipmentvendorid);
  expect.soft(getRes.equipmentvendor_name).toBe(vendorName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await equipmentVendorApi.searchEquipmentVendors(
    `equipmentvendor_name=${vendorName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.equipmentvendor_name === vendorName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.equipmentvendor_name = generateVendorName();
  payload.custom.equipmentvendor_pricing_time_uom = getRandom(PRICING_VALUES);
  payload.custom.equipmentvendor_vendorref = getRandom(VENDOR_REFS);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await equipmentVendorApi.updateEquipmentVendor(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await equipmentVendorApi.searchEquipmentVendors(
    `equipmentvendor_name=${payload.custom.equipmentvendor_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.equipmentvendor_name === payload.custom.equipmentvendor_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      equipmentvendor_name: generateVendorName(),
      related_equipmentcosting: getRandom(RELATED_EQUIPMENTCOSTING_IDS.filter(id => id !== relatedEquipmentCosting)),
      related_supplier: getRandom(RELATED_SUPPLIER_IDS.filter(id => id !== relatedSupplier)),
      equipmentvendor_vendorref: getRandom(VENDOR_REFS),
    }
  };

  const dummyRes = await equipmentVendorApi.createEquipmentVendor(dummyPayload);
  const deleteId = dummyRes.equipmentvendorid;

  const startDelete = Date.now();

  const deleteRes = await equipmentVendorApi.deleteEquipmentVendorById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await equipmentVendorApi.getEquipmentVendorById(deleteId);

  expect.soft(deletedCheck?.equipmentvendorid).toBeUndefined();
});
