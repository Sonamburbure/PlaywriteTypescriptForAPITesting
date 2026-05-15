import { test, expect } from '@playwright/test';
import { MenusApi } from '../src/api/MenusApi.js';

const EVENT_TYPE = [
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

const COURSE_TYPE = [
  'Signature Starter',
  'Premium Main Course',
  'Artisan Dessert',
  'Craft Beverage',
  'Gourmet Appetizer',
  'Chef\'s Special',
  'Seasonal Selection',
  'House Specialty',
  'Grand Buffet',
  'Tasting Menu'
];

const DISH_NAME = [
  'Deluxe Platter',
  'Signature Collection',
  'Premium Selection',
  'Chef\'s Choice',
  'Heritage Recipe',
  'Classic Ensemble',
  'Seasonal Delight',
  'Gourmet Experience',
  'Executive Set',
  'Bespoke Arrangement'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMenuName() {
  return `${getRandom(EVENT_TYPE)} ${getRandom(COURSE_TYPE)} ${getRandom(DISH_NAME)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const menusApi = new MenusApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const menuName = generateMenuName();

  const payload = {
    eventmenu_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventmenu_name: menuName,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await menusApi.createMenu(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventmenuid).toBeDefined();
  expect.soft(createRes.eventmenu_name).toBe(payload.custom.eventmenu_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await menusApi.getMenu();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventmenuid).toBe(createRes.eventmenuid);
  expect.soft(getRes.eventmenu_name).toBe(payload.custom.eventmenu_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await menusApi.searchMenus(
    `eventmenu_name=${payload.custom.eventmenu_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventmenu_name === payload.custom.eventmenu_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.eventmenu_name = generateMenuName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await menusApi.updateMenu(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await menusApi.searchMenus(
    `eventmenu_name=${payload.custom.eventmenu_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventmenu_name === payload.custom.eventmenu_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventmenu_name: generateMenuName(),
    }
  };

  const dummyRes = await menusApi.createMenu(dummyPayload);
  const deleteId = dummyRes.eventmenuid;

  const startDelete = Date.now();

  const deleteRes = await menusApi.deleteMenuById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await menusApi.getMenuById(deleteId);

  expect.soft(deletedCheck?.eventmenuid).toBeUndefined();
});
