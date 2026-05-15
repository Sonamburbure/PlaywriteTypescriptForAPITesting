import { test, expect } from '@playwright/test';
import { StepratedetailApi } from '../src/api/StepratedetailsApi.js';

const RATE_VALUES = ['5.00', '7.50', '10.00', '12.50', '15.00', '17.50', '20.00', '25.00'];
const RELATED_STEPRATE_IDS = [16, 17, 18, 19, 20];

const YEAR_PAIRS = [
  { start: '2025', end: '2026' },
  { start: '2026', end: '2027' },
  { start: '2027', end: '2028' },
  { start: '2028', end: '2029' },
  { start: '2029', end: '2030' },
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const stepratedetailApi = new StepratedetailApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const yearPair = getRandom(YEAR_PAIRS);
  const rate = getRandom(RATE_VALUES);
  const relatedSteprate = getRandom(RELATED_STEPRATE_IDS);

  const payload = {
    stepratedetail_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      related_steprate: relatedSteprate,
      stepratedetail_start: yearPair.start,
      stepratedetail_end: yearPair.end,
      stepratedetail_rate_per_tuom: rate,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await stepratedetailApi.createStepratedetail(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.stepratedetailid).toBeDefined();
  expect.soft(parseFloat(createRes.stepratedetail_rate_per_tuom)).toBe(parseFloat(rate));

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await stepratedetailApi.getStepratedetail();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.stepratedetailid).toBe(createRes.stepratedetailid);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await stepratedetailApi.searchStepratedetails('');

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.stepratedetailid === createRes.stepratedetailid
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.stepratedetail_rate_per_tuom = getRandom(RATE_VALUES);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await stepratedetailApi.updateStepratedetail(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyYearPair = getRandom(YEAR_PAIRS.filter(p => p.start !== yearPair.start));
  const dummySteprate = getRandom(RELATED_STEPRATE_IDS.filter(id => id !== relatedSteprate));

  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      related_steprate: dummySteprate,
      stepratedetail_start: dummyYearPair.start,
      stepratedetail_end: dummyYearPair.end,
      stepratedetail_rate_per_tuom: getRandom(RATE_VALUES),
    }
  };

  const dummyRes = await stepratedetailApi.createStepratedetail(dummyPayload);
  const deleteId = dummyRes.stepratedetailid;

  const startDelete = Date.now();

  const deleteRes = await stepratedetailApi.deleteStepratedetailById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await stepratedetailApi.getStepratedetailById(deleteId);

  expect.soft(deletedCheck?.stepratedetailid).toBeUndefined();
});
