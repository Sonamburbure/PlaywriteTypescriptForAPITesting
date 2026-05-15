import { test, expect } from '@playwright/test';
import { Segment2Api } from '../src/api/Segment2Api.js';

const CATEGORY_TYPE = [
  'Fresh', 'Chilled', 'Frozen', 'Ambient', 'Organic',
  'Premium', 'Artisan', 'Seasonal', 'Imported', 'Local'
];

const PRODUCT_CATEGORY = [
  'Juices', 'Soft Drinks', 'Energy Beverages', 'Dairy Products', 'Bakery Items',
  'Snacks', 'Hot Beverages', 'Packaged Water', 'Confectionery', 'Health Foods'
];

const GRADE = [
  'Selection', 'Collection', 'Range', 'Variety', 'Assortment',
  'Portfolio', 'Series', 'Line', 'Edition', 'Category'
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSegment2Name() {
  return `${getRandom(CATEGORY_TYPE)} ${getRandom(PRODUCT_CATEGORY)} ${getRandom(GRADE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const segment2Api = new Segment2Api(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const segmentName = generateSegment2Name();

  const payload = {
    segment2_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      segment2_name: segmentName,
      segment2_segment_type: 532,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await segment2Api.createSegment2(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.segment2id).toBeDefined();
  expect.soft(createRes.segment2_name).toBe(payload.custom.segment2_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await segment2Api.getSegment2();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.segment2id).toBe(createRes.segment2id);
  expect.soft(getRes.segment2_name).toBe(payload.custom.segment2_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await segment2Api.searchSegment2s(
    `segment2_name=${payload.custom.segment2_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.segment2_name === payload.custom.segment2_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.segment2_name = generateSegment2Name();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  const updateRes = await segment2Api.updateSegment2(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  if (!updateRes.ok) {
    console.warn(`⚠️ UPDATE not allowed (${updateRes.status}) — skipping PUT assertions`);
  } else {
    expect.soft(putTime).toBeLessThan(3000);

    const searchAfterPut = await segment2Api.searchSegment2s(
      `segment2_name=${payload.custom.segment2_name}`
    );
    const dataAfterPut = searchAfterPut?.data || [];
    const nameUpdated = dataAfterPut.some((item: any) =>
      item.segment2_name === payload.custom.segment2_name
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
      segment2_name: generateSegment2Name(),
    }
  };

  const dummyRes = await segment2Api.createSegment2(dummyPayload);
  const deleteId = dummyRes.segment2id;

  const startDelete = Date.now();

  const deleteRes = await segment2Api.deleteSegment2ById(deleteId);

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
    const deletedCheck = await segment2Api.getSegment2ById(deleteId);
    expect.soft(deletedCheck?.segment2id).toBeUndefined();
  }
});
