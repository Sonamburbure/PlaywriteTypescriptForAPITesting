import { test, expect } from '@playwright/test';
import { BarsetupEquipmentApi } from '../src/api/BarsetupEquipmentApi.js';

const EQUIPMENT_TYPE = [
  'Premium Bar Counter',
  'Signature Serving Station',
  'Commercial Cooling Unit',
  'Professional Dispensing Unit',
  'Executive Storage Unit',
  'Mobile Bar Cart',
  'Modular Bar System',
  'Refrigeration Cabinet',
  'Ice Bin Station',
  'Glass Rack Unit'
];

const USAGE_TYPE = [
  'Full-Service Setup',
  'Banquet Configuration',
  'VIP Event Setup',
  'Gala Service Setup',
  'Conference Bar Setup',
  'Reception Configuration',
  'Awards Ceremony Setup',
  'Exhibition Setup',
  'Corporate Event Setup',
  'Outdoor Event Setup'
];

const EVENT_CONTEXT = [
  'Corporate Gala',
  'Black-Tie Event',
  'Executive Dinner',
  'Annual Conference',
  'Awards Ceremony',
  'Business Summit',
  'VIP Reception',
  'Product Launch',
  'Charity Gala',
  'Networking Event'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEquipmentName() {
  return `${getRandom(EVENT_CONTEXT)} ${getRandom(EQUIPMENT_TYPE)} ${getRandom(USAGE_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const barsetupEquipmentApi = new BarsetupEquipmentApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const equipmentName = generateEquipmentName();

  const payload = {
    barsetupequipment_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      barsetupequipment_name: equipmentName,
      related_barsetup: 60,
      related_segment1: 400,
      related_unitofmeasure: 185,
      barsetupequipment_consumption_uom: 527,
      barsetupequipment_fixed_qty: '4',
      barsetupequipment_min: 1,
      barsetupequipment_max: 2,
      barsetupequipment_time_uom: 540,
      barsetupequipment_min_uom: 1,
      barsetupequipment_max_uom: 1,
      barsetupequipment_cost_con_uom_tuom: '1.00',
      barsetupequipment_margin: '0',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await barsetupEquipmentApi.createBarsetupEquipment(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.barsetupequipmentid).toBeDefined();
  expect.soft(createRes.barsetupequipment_name).toBe(payload.custom.barsetupequipment_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await barsetupEquipmentApi.getBarsetupEquipment();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.barsetupequipmentid).toBe(createRes.barsetupequipmentid);
  expect.soft(getRes.barsetupequipment_name).toBe(payload.custom.barsetupequipment_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await barsetupEquipmentApi.searchBarsetupEquipments(
    `barsetupequipment_name=${payload.custom.barsetupequipment_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.barsetupequipment_name === payload.custom.barsetupequipment_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.barsetupequipment_name = generateEquipmentName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await barsetupEquipmentApi.updateBarsetupEquipment(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await barsetupEquipmentApi.searchBarsetupEquipments(
    `barsetupequipment_name=${payload.custom.barsetupequipment_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.barsetupequipment_name === payload.custom.barsetupequipment_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      barsetupequipment_name: generateEquipmentName(),
    }
  };

  const dummyRes = await barsetupEquipmentApi.createBarsetupEquipment(dummyPayload);
  const deleteId = dummyRes.barsetupequipmentid;

  const startDelete = Date.now();

  const deleteRes = await barsetupEquipmentApi.deleteBarsetupEquipmentById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await barsetupEquipmentApi.getBarsetupEquipmentById(deleteId);

  expect.soft(deletedCheck?.barsetupequipmentid).toBeUndefined();
});
