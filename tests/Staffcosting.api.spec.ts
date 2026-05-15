import { test, expect } from '@playwright/test';
import { StaffCostingApi } from '../src/api/StafftypecostingApi.js';

const STAFF_LEVEL = [
  'Senior', 'Junior', 'Experienced',
  'Certified', 'Professional'
];

const STAFF_ROLE = [
  'Bartender', 'Service Staff', 'Event Supervisor',
  'Support Staff', 'Floor Manager'
];

const COSTING_TYPE = [
  'Daily Rate', 'Hourly Rate', 'Event Rate', 'Shift Rate'
];

const COST_VALUES = ['10.00', '15.00', '20.00', '25.00', '30.00'];

const RELATED_STAFFTYPE_IDS = [59, 60, 61, 62, 63];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCostingName() {
  return `${getRandom(STAFF_LEVEL)} ${getRandom(STAFF_ROLE)} ${getRandom(COSTING_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const staffCostingApi = new StaffCostingApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const costingName = generateCostingName();
  const cost = getRandom(COST_VALUES);
  const relatedStaffType = getRandom(RELATED_STAFFTYPE_IDS);

  const payload = {
    staffcosting_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      staffcosting_name: costingName,
      related_stafftype: relatedStaffType,
      staffcosting_tuom: 540,
      min_age: 18,
      max_age: 40,
      staffcosting_cost_time_uom: cost,
      staffcosting_costing_method: 598,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await staffCostingApi.createStaffCosting(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.staffcostingid).toBeDefined();
  expect.soft(createRes.staffcosting_name).toBe(costingName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await staffCostingApi.getStaffCosting();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.staffcostingid).toBe(createRes.staffcostingid);
  expect.soft(getRes.staffcosting_name).toBe(costingName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await staffCostingApi.searchStaffCostings(
    `staffcosting_name=${costingName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.staffcosting_name === costingName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.staffcosting_name = generateCostingName();
  payload.custom.staffcosting_cost_time_uom = getRandom(COST_VALUES);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await staffCostingApi.updateStaffCosting(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await staffCostingApi.searchStaffCostings(
    `staffcosting_name=${payload.custom.staffcosting_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.staffcosting_name === payload.custom.staffcosting_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      staffcosting_name: generateCostingName(),
      related_stafftype: getRandom(RELATED_STAFFTYPE_IDS.filter(id => id !== relatedStaffType)),
    }
  };

  const dummyRes = await staffCostingApi.createStaffCosting(dummyPayload);
  const deleteId = dummyRes.staffcostingid;

  const startDelete = Date.now();

  const deleteRes = await staffCostingApi.deleteStaffCostingById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await staffCostingApi.getStaffCostingById(deleteId);

  expect.soft(deletedCheck?.staffcostingid).toBeUndefined();
});
