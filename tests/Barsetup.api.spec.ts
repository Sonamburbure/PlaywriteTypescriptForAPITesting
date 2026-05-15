import { test, expect } from '@playwright/test';
import { BarsetupApi } from '../src/api/BarSetupApi.js';

const BAR_TYPE = [
  'Executive Bar',
  'Signature Bar',
  'Premium Bar',
  'Elite Bar',
  'Grand Bar',
  'Heritage Bar',
  'Prestige Bar',
  'Platinum Bar',
  'Deluxe Bar',
  'Classic Bar'
];

const SETUP_STYLE = [
  'Full-Service Setup',
  'Turnkey Setup',
  'Custom Setup',
  'Signature Setup',
  'Premium Configuration',
  'Banquet Configuration',
  'Exhibition Setup',
  'Gala Configuration',
  'Conference Setup',
  'Event-Ready Setup'
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

function generateBarName() {
  return `${getRandom(EVENT_CONTEXT)} ${getRandom(BAR_TYPE)} ${getRandom(SETUP_STYLE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const barsetupApi = new BarsetupApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const barName = `${generateBarName()}_${unique()}`;

  const payload = {
    barsetup_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      barsetup_name: barName,
      barsetup_category: 627,
      barsetup_subcategory: '',
      barsetup_sort_category: '',
      barsetup_status: 631,
      barsetup_type: 633,
      barsetup_product_required: 634,
      barsetup_equipment_required: 636,
      barsetup_staff_required: 638,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await barsetupApi.createBarsetup(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.barsetupid).toBeDefined();
  expect.soft(createRes.barsetup_name).toBe(payload.custom.barsetup_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await barsetupApi.getBarsetup();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.barsetupid).toBe(createRes.barsetupid);
  expect.soft(getRes.barsetup_name).toBe(payload.custom.barsetup_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await barsetupApi.searchBarsetups(
    `barsetup_name=${payload.custom.barsetup_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.barsetup_name === payload.custom.barsetup_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.barsetup_name = `${generateBarName()}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await barsetupApi.updateBarsetup(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await barsetupApi.searchBarsetups(
    `barsetup_name=${payload.custom.barsetup_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.barsetup_name === payload.custom.barsetup_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      barsetup_name: `${generateBarName()}_${unique()}`,
    }
  };

  const dummyRes = await barsetupApi.createBarsetup(dummyPayload);
  const deleteId = dummyRes.barsetupid;

  const startDelete = Date.now();

  const deleteRes = await barsetupApi.deleteBarsetupById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await barsetupApi.getBarsetupById(deleteId);

  expect.soft(deletedCheck?.barsetupid).toBeUndefined();
});
