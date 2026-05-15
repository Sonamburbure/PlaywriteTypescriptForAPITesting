import { test, expect } from '@playwright/test';
import { MenusitemApi } from '../src/api/Menusitem.js';

const DISH_PREFIX = [
  'Grilled', 'Roasted', 'Steamed', 'Pan-Seared', 'Braised',
  'Smoked', 'Poached', 'Crispy', 'Stuffed', 'Glazed'
];

const DISH_MAIN = [
  'Salmon Fillet', 'Beef Tenderloin', 'Chicken Supreme', 'Lamb Chops', 'Sea Bass',
  'Duck Confit', 'Prawn Skewers', 'Vegetable Medley', 'Mushroom Risotto', 'Lobster Bisque'
];

const DISH_STYLE = [
  'with Herb Butter', 'with Red Wine Jus', 'with Lemon Caper Sauce', 'with Truffle Oil',
  'with Seasonal Vegetables', 'with Garlic Cream', 'with Balsamic Glaze',
  'with Mango Salsa', 'with Pesto Dressing', 'with Saffron Sauce'
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const EVENT_MENU_IDS = [1, 5, 10, 15, 20];
const ITEM_SERVED_IDS = [49, 50, 51, 52, 53];

function generateItemName() {
  return `${getRandom(DISH_PREFIX)} ${getRandom(DISH_MAIN)} ${getRandom(DISH_STYLE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const menusitemApi = new MenusitemApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const itemName = generateItemName();

  const payload = {
    eventmenuitem_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventmenuitem_name: itemName,
      related_eventmenu: getRandom(EVENT_MENU_IDS),
      related_itemserved: getRandom(ITEM_SERVED_IDS),
      eventmenuitem_conv_person_hour: '10',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await menusitemApi.createMenusitem(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventmenuitemid).toBeDefined();
  expect.soft(createRes.eventmenuitem_name).toBe(payload.custom.eventmenuitem_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await menusitemApi.getMenusitem();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventmenuitemid).toBe(createRes.eventmenuitemid);
  expect.soft(getRes.eventmenuitem_name).toBe(payload.custom.eventmenuitem_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await menusitemApi.searchMenusitems(
    `eventmenuitem_name=${payload.custom.eventmenuitem_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventmenuitem_name === payload.custom.eventmenuitem_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.eventmenuitem_name = generateItemName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await menusitemApi.updateMenusitem(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await menusitemApi.searchMenusitems(
    `eventmenuitem_name=${payload.custom.eventmenuitem_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventmenuitem_name === payload.custom.eventmenuitem_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventmenuitem_name: generateItemName(),
    }
  };

  const dummyRes = await menusitemApi.createMenusitem(dummyPayload);
  const deleteId = dummyRes.eventmenuitemid;

  const startDelete = Date.now();

  const deleteRes = await menusitemApi.deleteMenusitemById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await menusitemApi.getMenusitemById(deleteId);

  expect.soft(deletedCheck?.eventmenuitemid).toBeUndefined();
});
