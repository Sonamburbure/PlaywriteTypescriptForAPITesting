import { test, expect } from '@playwright/test';
import { StepRateApi } from '../src/api/StepRatesApi.js';

const RATE_TITLE = [
  'Standard Hourly Rate', 'Weekend Premium Rate', 'Holiday Special Rate',
  'Night Shift Rate', 'Overtime Rate', 'Event Staff Rate',
  'Senior Staff Rate', 'Temporary Staff Rate', 'Peak Hours Rate', 'Contractor Rate'
];

const RATE_DESCRIPTION = [
  'Applicable for standard working hours under normal conditions.',
  'Used for staff working during weekends with additional compensation.',
  'Applicable during public holidays with premium pricing applied.',
  'Used for late night or overnight shifts.',
  'Applied when working hours exceed regular shift duration.',
  'Standard rate for event-based staffing operations.',
  'Applicable for experienced or senior-level staff.',
  'Used for temporary or short-term staff assignments.',
  'Applied during peak business hours with higher demand.',
  'Rate defined for third-party or contract-based staff.'
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRateName() {
  return `${getRandom(RATE_TITLE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const stepRateApi = new StepRateApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const rateName = generateRateName();

  const payload = {
    steprate_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      steprate_name: rateName,
      steprate_description: getRandom(RATE_DESCRIPTION),
      steprate_tuom: 540,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await stepRateApi.createStepRate(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.steprateid).toBeDefined();
  expect.soft(createRes.steprate_name).toBe(payload.custom.steprate_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await stepRateApi.getStepRate();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.steprateid).toBe(createRes.steprateid);
  expect.soft(getRes.steprate_name).toBe(payload.custom.steprate_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await stepRateApi.searchStepRates(
    `steprate_name=${payload.custom.steprate_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.steprate_name === payload.custom.steprate_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.steprate_name = generateRateName();
  payload.custom.steprate_description = getRandom(RATE_DESCRIPTION);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await stepRateApi.updateStepRate(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await stepRateApi.searchStepRates(
    `steprate_name=${payload.custom.steprate_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.steprate_name === payload.custom.steprate_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      steprate_name: generateRateName(),
    }
  };

  const dummyRes = await stepRateApi.createStepRate(dummyPayload);
  const deleteId = dummyRes.steprateid;

  const startDelete = Date.now();

  const deleteRes = await stepRateApi.deleteStepRateById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await stepRateApi.getStepRateById(deleteId);

  expect.soft(deletedCheck?.steprateid).toBeUndefined();
});
