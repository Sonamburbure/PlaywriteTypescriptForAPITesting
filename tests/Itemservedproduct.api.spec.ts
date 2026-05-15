import { test, expect } from '@playwright/test';
import { ItemservedproductApi } from '../src/api/ItemservedproductApi.js';

const PRODUCT_TYPE = [
  'Premium Cocktail Mix',
  'Signature Mocktail Base',
  'Artisan Juice Blend',
  'Craft Soft Drink',
  'Specialty Energy Beverage',
  'House Fruit Mix',
  'Reserve Spirit Base',
  'Seasonal Syrup Blend',
  'Classic Bitters Mix',
  'Bespoke Tonic'
];

const USAGE_TYPE = [
  'Banquet Preparation',
  'VIP Serving',
  'Full-Service Consumption',
  'Premium Mixing',
  'Gala Distribution',
  'Reception Service',
  'Conference Supply',
  'Executive Hospitality',
  'Awards Ceremony Use',
  'Corporate Event Supply'
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

function generateProductName() {
  return `${getRandom(EVENT_CONTEXT)} ${getRandom(PRODUCT_TYPE)} ${getRandom(USAGE_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const itemservedproductApi = new ItemservedproductApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const productName = generateProductName();

  const payload = {
    itemproduct_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      itemproduct_name: productName,
      related_itemserved: 49,
      related_segment1: 260,
      related_unitofmeasure: 186,
      itemproduct_consumption_uom: 527,
      itemproduct_fixed_qty: '5',
      itemproduct_min: 0,
      itemproduct_max: 0,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await itemservedproductApi.createItemservedproduct(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.itemproductid).toBeDefined();
  expect.soft(createRes.itemproduct_name).toBe(payload.custom.itemproduct_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await itemservedproductApi.getItemservedproduct();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.itemproductid).toBe(createRes.itemproductid);
  expect.soft(getRes.itemproduct_name).toBe(payload.custom.itemproduct_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await itemservedproductApi.searchItemservedproducts(
    `itemproduct_name=${payload.custom.itemproduct_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.itemproduct_name === payload.custom.itemproduct_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.itemproduct_name = generateProductName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await itemservedproductApi.updateItemservedproduct(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await itemservedproductApi.searchItemservedproducts(
    `itemproduct_name=${payload.custom.itemproduct_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.itemproduct_name === payload.custom.itemproduct_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      itemproduct_name: generateProductName(),
    }
  };

  const dummyRes = await itemservedproductApi.createItemservedproduct(dummyPayload);
  const deleteId = dummyRes.itemproductid;

  const startDelete = Date.now();

  const deleteRes = await itemservedproductApi.deleteItemservedproductById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await itemservedproductApi.getItemservedproductById(deleteId);

  expect.soft(deletedCheck?.itemproductid).toBeUndefined();
});
