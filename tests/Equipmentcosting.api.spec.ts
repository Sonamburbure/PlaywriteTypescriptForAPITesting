import { test, expect } from '@playwright/test';
import { EquipmentCostingApi } from '../src/api/EquipmentcostingApi.js';

const EQUIPMENT_PREFIX = [
  'Premium', 'Standard', 'Heavy Duty',
  'Compact', 'Professional', 'Deluxe'
];

const EQUIPMENT_TYPES = [
  'Bar Counter', 'Ice Machine', 'Serving Table',
  'Cocktail Station', 'Glass Rack', 'Cooling Unit'
];

const COSTING_TYPES = [
  'Daily Cost', 'Hourly Cost', 'Event Cost',
  'Rental Cost', 'Standard Cost'
];

const COST_VALUES = ['0.00', '1.50', '2.00', '5.00', '10.00'];

const RELATED_EQUIPMENT_IDS = [122, 123, 124, 125, 126];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCostingName() {
  return `${getRandom(EQUIPMENT_PREFIX)} ${getRandom(EQUIPMENT_TYPES)} ${getRandom(COSTING_TYPES)}_${Date.now()}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const equipmentCostingApi = new EquipmentCostingApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const costingName = generateCostingName();
  const cost = getRandom(COST_VALUES);
  const relatedEquipment = getRandom(RELATED_EQUIPMENT_IDS);

  const payload = {
    equipmentcosting_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      equipmentcosting_name: costingName,
      related_equipment: relatedEquipment,
      equipmentcosting_tuom: 540,
      equipmentcosting_priority: 'first',
      equipmentcosting_std_cost_tuom: cost,
      equipmentcosting_avg_cost_tuom: cost,
      equipmentcosting_costing_method: 568,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await equipmentCostingApi.createEquipmentCosting(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.equipmentcostingid).toBeDefined();
  expect.soft(createRes.equipmentcosting_name).toBe(costingName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await equipmentCostingApi.getEquipmentCosting();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.equipmentcostingid).toBe(createRes.equipmentcostingid);
  expect.soft(getRes.equipmentcosting_name).toBe(costingName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await equipmentCostingApi.searchEquipmentCostings(
    `equipmentcosting_name=${costingName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.equipmentcosting_name === costingName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.equipmentcosting_name = generateCostingName();
  payload.custom.equipmentcosting_std_cost_tuom = getRandom(COST_VALUES);
  payload.custom.equipmentcosting_avg_cost_tuom = payload.custom.equipmentcosting_std_cost_tuom;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await equipmentCostingApi.updateEquipmentCosting(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await equipmentCostingApi.searchEquipmentCostings(
    `equipmentcosting_name=${payload.custom.equipmentcosting_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.equipmentcosting_name === payload.custom.equipmentcosting_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      equipmentcosting_name: generateCostingName(),
      related_equipment: getRandom(RELATED_EQUIPMENT_IDS.filter(id => id !== relatedEquipment)),
    }
  };

  const dummyRes = await equipmentCostingApi.createEquipmentCosting(dummyPayload);
  const deleteId = dummyRes.equipmentcostingid;

  const startDelete = Date.now();

  const deleteRes = await equipmentCostingApi.deleteEquipmentCostingById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await equipmentCostingApi.getEquipmentCostingById(deleteId);

  expect.soft(deletedCheck?.equipmentcostingid).toBeUndefined();
});
