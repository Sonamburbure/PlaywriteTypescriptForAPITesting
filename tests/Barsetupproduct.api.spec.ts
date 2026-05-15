import { test, expect } from '@playwright/test';
import { BarsetupproductApi } from '../src/api/BarsetupproductApi.js';

const PRODUCT_CATEGORY = [
  'Premium Spirit',
  'Craft Beer',
  'Fine Wine',
  'Signature Cocktail',
  'Artisan Mixer',
  'House Beverage',
  'Classic Spirit',
  'Reserve Selection',
  'Seasonal Blend',
  'Specialty Drink'
];

const PRODUCT_USAGE = [
  'Full-Service Consumption',
  'Bar Stock Replenishment',
  'Event Distribution',
  'Banquet Service',
  'VIP Service',
  'Guest Hospitality',
  'Catering Supply',
  'Reception Service',
  'Gala Service',
  'Conference Supply'
];

const BAR_CONTEXT = [
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

function generateProductName() {
  return `${getRandom(BAR_CONTEXT)} ${getRandom(PRODUCT_CATEGORY)} ${getRandom(PRODUCT_USAGE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const barsetupproductApi = new BarsetupproductApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const productName = generateProductName();

  const payload = {
    barsetupproduct_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      barsetupproduct_name: productName,
      related_barsetup: 60,
      related_segment1: 275,
      related_segment2: 54,
      related_unitofmeasure: 186,
      barsetupproduct_consumption_uom: 527,
      barsetupproduct_fixed_qty: '4',
      barsetupproduct_min: 0,
      barsetupproduct_max: 0,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await barsetupproductApi.createBarsetupproduct(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.barsetupproductid).toBeDefined();
  expect.soft(createRes.barsetupproduct_name).toBe(payload.custom.barsetupproduct_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await barsetupproductApi.getBarsetupproduct();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.barsetupproductid).toBe(createRes.barsetupproductid);
  expect.soft(getRes.barsetupproduct_name).toBe(payload.custom.barsetupproduct_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await barsetupproductApi.searchBarsetupproducts(
    `barsetupproduct_name=${payload.custom.barsetupproduct_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.barsetupproduct_name === payload.custom.barsetupproduct_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.barsetupproduct_name = generateProductName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await barsetupproductApi.updateBarsetupproduct(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await barsetupproductApi.searchBarsetupproducts(
    `barsetupproduct_name=${payload.custom.barsetupproduct_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.barsetupproduct_name === payload.custom.barsetupproduct_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      barsetupproduct_name: generateProductName(),
    }
  };

  const dummyRes = await barsetupproductApi.createBarsetupproduct(dummyPayload);
  const deleteId = dummyRes.barsetupproductid;

  const startDelete = Date.now();

  const deleteRes = await barsetupproductApi.deleteBarsetupproductById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await barsetupproductApi.getBarsetupproductById(deleteId);

  expect.soft(deletedCheck?.barsetupproductid).toBeUndefined();
});
