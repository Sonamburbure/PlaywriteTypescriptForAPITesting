import { test, expect } from '@playwright/test';
import { EquipmentBundleApi } from '../src/api/EquipmentbundelApi.js';

const BUNDLE_PREFIX = [
  'Premium', 'Standard', 'Deluxe',
  'Professional', 'Essential'
];

const BUNDLE_TYPES = [
  'Bar Setup', 'Cocktail Service Kit', 'Event Serving Setup',
  'Beverage Station Setup', 'Mobile Bar Kit'
];

const BUNDLE_PURPOSE = [
  'Package', 'Bundle', 'Setup', 'Kit', 'Arrangement'
];

const PARENT_EQUIPMENT_IDS = [138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 150, 155, 160, 165, 168, 169];
const CHILD_EQUIPMENT_IDS  = [138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 150, 155, 160, 165, 168, 169];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBundleName() {
  return `${getRandom(BUNDLE_PREFIX)} ${getRandom(BUNDLE_TYPES)} ${getRandom(BUNDLE_PURPOSE)}_${Date.now()}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const equipmentBundleApi = new EquipmentBundleApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const bundleName = generateBundleName();
  const parentEquipment = getRandom(PARENT_EQUIPMENT_IDS);
  const childEquipment = getRandom(CHILD_EQUIPMENT_IDS.filter(id => id !== parentEquipment));

  const payload = {
    equipmentbundle_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      equipmentbundle_name: bundleName,
      related_equipment: parentEquipment,
      equipmentbundlechildequipment_multiple_record: childEquipment,
      equipmentbundlechildequipment_multiple_module: 'equipment',
      child_product_qty: '1.00',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await equipmentBundleApi.createEquipmentBundle(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.equipmentbundleid).toBeDefined();
  expect.soft(createRes.equipmentbundle_name).toBe(bundleName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await equipmentBundleApi.getEquipmentBundle();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.equipmentbundleid).toBe(createRes.equipmentbundleid);
  expect.soft(getRes.equipmentbundle_name).toBe(bundleName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await equipmentBundleApi.searchEquipmentBundles(
    `equipmentbundle_name=${bundleName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.equipmentbundle_name === bundleName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.equipmentbundle_name = generateBundleName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await equipmentBundleApi.updateEquipmentBundle(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await equipmentBundleApi.searchEquipmentBundles(
    `equipmentbundle_name=${payload.custom.equipmentbundle_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.equipmentbundle_name === payload.custom.equipmentbundle_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyParent = getRandom(PARENT_EQUIPMENT_IDS.filter(id => id !== parentEquipment));
  const dummyChild = getRandom(CHILD_EQUIPMENT_IDS.filter(id => id !== dummyParent));

  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      equipmentbundle_name: generateBundleName(),
      related_equipment: dummyParent,
      equipmentbundlechildequipment_multiple_record: dummyChild,
    }
  };

  const dummyRes = await equipmentBundleApi.createEquipmentBundle(dummyPayload);
  const deleteId = dummyRes.equipmentbundleid;

  const startDelete = Date.now();

  const deleteRes = await equipmentBundleApi.deleteEquipmentBundleById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await equipmentBundleApi.getEquipmentBundleById(deleteId);

  expect.soft(deletedCheck?.equipmentbundleid).toBeUndefined();
});
