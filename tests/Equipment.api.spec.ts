import { test, expect } from '@playwright/test';
import { EquipmentApi } from '../src/api/EquipmentApi.js';

const EQUIPMENT_PREFIX = [
  'Premium', 'Standard', 'Heavy Duty',
  'Compact', 'Professional', 'Deluxe'
];

const EQUIPMENT_TYPES = [
  'Bar Counter', 'Ice Machine', 'Serving Table',
  'Glass Rack', 'Cocktail Station', 'Cooling Unit'
];

const EQUIPMENT_SIZE = [
  'Single Unit', 'Double Unit', 'Large',
  'Portable', 'Industrial'
];

const RELATED_SEGMENT1_IDS = [41, 157, 211, 259, 275];
const RELATED_UOM_IDS = [15, 182, 185, 186, 527];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEquipmentName() {
  return `${getRandom(EQUIPMENT_PREFIX)} ${getRandom(EQUIPMENT_TYPES)} ${getRandom(EQUIPMENT_SIZE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const equipmentApi = new EquipmentApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const equipmentName = generateEquipmentName();
  const relatedSegment1 = getRandom(RELATED_SEGMENT1_IDS);
  const relatedUom = getRandom(RELATED_UOM_IDS);

  const payload = {
    equipment_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      equipment_name: equipmentName,
      equipment_category: '1106',
      equipment_subcategory: 1134,
      equipment_status: 564,
      related_segment1: relatedSegment1,
      related_unitofmeasure: relatedUom,
      equipment_salesvat: 566,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await equipmentApi.createEquipment(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.equipmentid).toBeDefined();
  expect.soft(createRes.equipment_name).toBe(equipmentName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await equipmentApi.getEquipment();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.equipmentid).toBe(createRes.equipmentid);
  expect.soft(getRes.equipment_name).toBe(equipmentName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await equipmentApi.searchEquipments(
    `equipment_name=${equipmentName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.equipment_name === equipmentName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.equipment_name = generateEquipmentName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await equipmentApi.updateEquipment(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await equipmentApi.searchEquipments(
    `equipment_name=${payload.custom.equipment_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.equipment_name === payload.custom.equipment_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      equipment_name: generateEquipmentName(),
      related_segment1: getRandom(RELATED_SEGMENT1_IDS.filter(id => id !== relatedSegment1)),
    }
  };

  const dummyRes = await equipmentApi.createEquipment(dummyPayload);
  const deleteId = dummyRes.equipmentid;

  const startDelete = Date.now();

  const deleteRes = await equipmentApi.deleteEquipmentById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await equipmentApi.getEquipmentById(deleteId);

  expect.soft(deletedCheck?.equipmentid).toBeUndefined();
});
