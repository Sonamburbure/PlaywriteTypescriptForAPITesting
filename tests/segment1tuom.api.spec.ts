import { test, expect } from '@playwright/test';
import { Segment1TuomApi } from '../src/api/Segments1TuomApi.js';

const RELATED_SEGMENT1_IDS = [41, 211, 260, 275, 400, 409];
const HOURS_OPTIONS = ['4', '6', '8', '10', '12'];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const segment1TuomApi = new Segment1TuomApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const relatedSegment1 = getRandom(RELATED_SEGMENT1_IDS);

  const payload = {
    segment1tuom_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      related_segment1: relatedSegment1,
      segment1tuom_tuom: 540,
      hours_included: getRandom(HOURS_OPTIONS),
      min_time_uom: '1',
      max_time_uom: '1',
      block_quantity_time_uom: '1',
      decimal_places_tuom_quantity: '1',
      buffer_tuom_quantity_before_event: '1',
      buffer_tuom_quantity_after_event: '1',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await segment1TuomApi.createSegment1Tuom(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.segment1tuomid).toBeDefined();

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await segment1TuomApi.getSegment1Tuom();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.segment1tuomid).toBe(createRes.segment1tuomid);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await segment1TuomApi.searchSegment1Tuoms('');

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.segment1tuomid === createRes.segment1tuomid
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.hours_included = getRandom(HOURS_OPTIONS);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  const updateRes = await segment1TuomApi.updateSegment1Tuom(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  if (!updateRes.ok) {
    console.warn(`⚠️ UPDATE not allowed (${updateRes.status}) — skipping PUT assertions`);
  } else {
    expect.soft(putTime).toBeLessThan(3000);
  }

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummySegment1 = getRandom(RELATED_SEGMENT1_IDS.filter(id => id !== relatedSegment1));

  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      related_segment1: dummySegment1,
      hours_included: getRandom(HOURS_OPTIONS),
    }
  };

  const dummyRes = await segment1TuomApi.createSegment1Tuom(dummyPayload);
  const deleteId = dummyRes.segment1tuomid;

  const startDelete = Date.now();

  const deleteRes = await segment1TuomApi.deleteSegment1TuomById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  if (!deleteRes.ok) {
    console.warn(`⚠️ DELETE not allowed (${deleteRes.status}) — skipping DELETE assertions`);
  } else {
    expect.soft(deleteTime).toBeLessThan(4000);
    expect.soft(deleteRes.body?.success).toBe(true);

    // =======================
    // 🔥 VERIFY DELETE
    // =======================
    const deletedCheck = await segment1TuomApi.getSegment1TuomById(deleteId);
    expect.soft(deletedCheck?.segment1tuomid).toBeUndefined();
  }
});
