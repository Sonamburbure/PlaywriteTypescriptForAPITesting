import { test, expect } from '@playwright/test';
import { ItemservedStaffingApi } from '../src/api/ItemservedStaffingApi.js';

const STAFF_ROLE = [
  'Lead Bartender',
  'Senior Serving Staff',
  'Bar Supervisor',
  'Event Floor Manager',
  'VIP Service Attendant',
  'Beverage Specialist',
  'Cocktail Expert',
  'Guest Relations Officer',
  'Banquet Coordinator',
  'Service Team Lead'
];

const SERVICE_TYPE = [
  'Full Bar Service',
  'Premium Guest Service',
  'VIP Event Execution',
  'Banquet Operations',
  'Reception Management',
  'Gala Service Support',
  'Corporate Event Service',
  'Awards Ceremony Support',
  'Conference Bar Operations',
  'Executive Hospitality'
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

function generateStaffName() {
  return `${getRandom(EVENT_CONTEXT)} ${getRandom(STAFF_ROLE)} ${getRandom(SERVICE_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const itemservedStaffingApi = new ItemservedStaffingApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const staffName = generateStaffName();

  const payload = {
    itemstaff_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      itemstaff_name: staffName,
      related_itemserved: 49,
      related_segment1: 41,
      related_unitofmeasure: 182,
      itemstaff_consumption_uom: 527,
      itemstaff_fixed_qty: '4',
      itemstaff_min: 0,
      itemstaff_max: 0,
      itemstaff_time_uom: 540,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await itemservedStaffingApi.createItemservedStaffing(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.itemstaffid).toBeDefined();
  expect.soft(createRes.itemstaff_name).toBe(payload.custom.itemstaff_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await itemservedStaffingApi.getItemservedStaffing();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.itemstaffid).toBe(createRes.itemstaffid);
  expect.soft(getRes.itemstaff_name).toBe(payload.custom.itemstaff_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await itemservedStaffingApi.searchItemservedStaffings(
    `itemstaff_name=${payload.custom.itemstaff_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.itemstaff_name === payload.custom.itemstaff_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.itemstaff_name = generateStaffName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await itemservedStaffingApi.updateItemservedStaffing(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await itemservedStaffingApi.searchItemservedStaffings(
    `itemstaff_name=${payload.custom.itemstaff_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.itemstaff_name === payload.custom.itemstaff_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      itemstaff_name: generateStaffName(),
    }
  };

  const dummyRes = await itemservedStaffingApi.createItemservedStaffing(dummyPayload);
  const deleteId = dummyRes.itemstaffid;

  const startDelete = Date.now();

  const deleteRes = await itemservedStaffingApi.deleteItemservedStaffingById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await itemservedStaffingApi.getItemservedStaffingById(deleteId);

  expect.soft(deletedCheck?.itemstaffid).toBeUndefined();
});
