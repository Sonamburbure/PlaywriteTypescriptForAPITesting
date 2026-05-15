import { test, expect } from '@playwright/test';
import { ItemservedApi } from '../src/api/ItemservedApi.js';

const DRINK_TYPE = [
  'Premium Cocktail',
  'Signature Mocktail',
  'Craft Beverage',
  'Artisan Juice',
  'Specialty Energy Drink',
  'House Mixed Beverage',
  'Reserve Wine Selection',
  'Classic Spirit Pour',
  'Seasonal Blend',
  'Bespoke Drink'
];

const SERVICE_STYLE = [
  'Full-Service Station',
  'Premium Serving Counter',
  'Banquet Distribution Point',
  'VIP Service Desk',
  'Guest Experience Station',
  'Gala Beverage Counter',
  'Executive Serving Station',
  'Reception Service Point',
  'Conference Beverage Station',
  'Hospitality Counter'
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

function generateItemName() {
  return `${getRandom(EVENT_CONTEXT)} ${getRandom(DRINK_TYPE)} ${getRandom(SERVICE_STYLE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const itemservedApi = new ItemservedApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const itemName = generateItemName();

  const payload = {
    itemserved_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      itemserved_name: itemName,
      itemserved_category: '608',
      itemserved_subcategory: 1159,
      itemserved_status: 618,
      itemserved_type: 620,
      itemserved_product_required: 621,
      itemserved_equipment_required: 623,
      itemserved_staff_required: 625,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await itemservedApi.createItemserved(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.itemservedid).toBeDefined();
  expect.soft(createRes.itemserved_name).toBe(payload.custom.itemserved_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await itemservedApi.getItemserved();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.itemservedid).toBe(createRes.itemservedid);
  expect.soft(getRes.itemserved_name).toBe(payload.custom.itemserved_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await itemservedApi.searchItemserveds(
    `itemserved_name=${payload.custom.itemserved_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.itemserved_name === payload.custom.itemserved_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.itemserved_name = generateItemName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await itemservedApi.updateItemserved(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await itemservedApi.searchItemserveds(
    `itemserved_name=${payload.custom.itemserved_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.itemserved_name === payload.custom.itemserved_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      itemserved_name: generateItemName(),
    }
  };

  const dummyRes = await itemservedApi.createItemserved(dummyPayload);
  const deleteId = dummyRes.itemservedid;

  const startDelete = Date.now();

  const deleteRes = await itemservedApi.deleteItemservedById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await itemservedApi.getItemservedById(deleteId);

  expect.soft(deletedCheck?.itemservedid).toBeUndefined();
});
