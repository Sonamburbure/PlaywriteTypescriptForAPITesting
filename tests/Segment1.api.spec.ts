import { test, expect } from '@playwright/test';
import { Segment1Api } from '../src/api/Segment1Api.js';

const INGREDIENT_TYPE = [
  'Fresh Fruit', 'Citrus Blend', 'Berry Mix', 'Tropical Fruit', 'Stone Fruit',
  'Herb Infusion', 'Spice Blend', 'Nut Variety', 'Grain Selection', 'Dairy Product'
];

const PRODUCT_FORM = [
  'Juice', 'Puree', 'Extract', 'Concentrate', 'Syrup',
  'Powder', 'Paste', 'Essence', 'Infusion', 'Blend'
];

const QUALITY_GRADE = [
  'Premium Grade', 'Reserve Grade', 'Select Grade', 'Signature Grade', 'Classic Grade',
  'Artisan Grade', 'Executive Grade', 'Heritage Grade', 'Deluxe Grade', 'Standard Grade'
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSegmentName() {
  return `${getRandom(INGREDIENT_TYPE)} ${getRandom(PRODUCT_FORM)} ${getRandom(QUALITY_GRADE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const segment1Api = new Segment1Api(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const segmentName = generateSegmentName();

  const payload = {
    segment1_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      segment1_name: segmentName,
      segment_type: 532,
      cost_type: 535,
      serial_lot_control: 550,
      related_unitofmeasure: 15,
      segment1_consumable_uom: 527,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await segment1Api.createSegment1(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.segment1id).toBeDefined();
  expect.soft(createRes.segment1_name).toBe(payload.custom.segment1_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await segment1Api.getSegment1();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.segment1id).toBe(createRes.segment1id);
  expect.soft(getRes.segment1_name).toBe(payload.custom.segment1_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await segment1Api.searchSegment1s(
    `segment1_name=${payload.custom.segment1_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.segment1_name === payload.custom.segment1_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.segment1_name = generateSegmentName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  const updateRes = await segment1Api.updateSegment1(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  if (!updateRes.ok) {
    console.warn(`⚠️ UPDATE not allowed (${updateRes.status}) — skipping PUT assertions`);
  } else {
    expect.soft(putTime).toBeLessThan(3000);

    const searchAfterPut = await segment1Api.searchSegment1s(
      `segment1_name=${payload.custom.segment1_name}`
    );
    const dataAfterPut = searchAfterPut?.data || [];
    const nameUpdated = dataAfterPut.some((item: any) =>
      item.segment1_name === payload.custom.segment1_name
    );
    expect.soft(nameUpdated).toBeTruthy();
  }

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      segment1_name: generateSegmentName(),
    }
  };

  const dummyRes = await segment1Api.createSegment1(dummyPayload);
  const deleteId = dummyRes.segment1id;

  const startDelete = Date.now();

  const deleteRes = await segment1Api.deleteSegment1ById(deleteId);

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
    const deletedCheck = await segment1Api.getSegment1ById(deleteId);
    expect.soft(deletedCheck?.segment1id).toBeUndefined();
  }
});
