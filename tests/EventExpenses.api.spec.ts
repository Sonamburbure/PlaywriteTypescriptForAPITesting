import { test, expect } from '@playwright/test';
import { EventExpenseAPI } from '../src/api/EventExpensesApi.js';

const EXPENSE_NAMES = [
  'Food and Beverage',
  'Venue Rental',
  'Entertainment',
  'Decorations',
  'Transportation',
  'Staffing',
  'Marketing and Promotion',
  'Miscellaneous',
  'Catering Service',
  'Decoration Arrangement',
  'Logistics Planning',
  'Entertainment Management',
  'Staff Coordination',
  'Equipment Handling'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const eventExpenseApi = new EventExpenseAPI(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const expenseName = `${getRandom(EXPENSE_NAMES)}_${unique()}`;

  const payload = {
    eventforecastedcost_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventforecastedcost_name: expenseName,
      related_event: 254,
      eventforecastedcost_category: 662,
      eventforecastedcost_type: 664,
      eventforecastedcost_status: 698,
      eventforecastedcost_description: `Cost allocated for ${expenseName.toLowerCase()} activities`,
      eventforecastedcost_amount: '50000.00',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await eventExpenseApi.createEventExpense(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventforecastedcostid).toBeDefined();
  expect.soft(createRes.eventforecastedcost_name).toBe(payload.custom.eventforecastedcost_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await eventExpenseApi.getEventExpense();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventforecastedcostid).toBe(createRes.eventforecastedcostid);
  expect.soft(getRes.eventforecastedcost_name).toBe(payload.custom.eventforecastedcost_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await eventExpenseApi.searchEventExpenses(
    `eventforecastedcost_name=${payload.custom.eventforecastedcost_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventforecastedcost_name === payload.custom.eventforecastedcost_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  const updatedName = `${getRandom(EXPENSE_NAMES)}_${unique()}`;
  payload.custom.eventforecastedcost_name = updatedName;
  payload.custom.eventforecastedcost_description = `Cost allocated for ${updatedName.toLowerCase()} activities`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await eventExpenseApi.updateEventExpense(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await eventExpenseApi.searchEventExpenses(
    `eventforecastedcost_name=${payload.custom.eventforecastedcost_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventforecastedcost_name === payload.custom.eventforecastedcost_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyName = `${getRandom(EXPENSE_NAMES)}_${unique()}`;
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventforecastedcost_name: dummyName,
      eventforecastedcost_description: `Cost allocated for ${dummyName.toLowerCase()} activities`,
    }
  };

  const dummyRes = await eventExpenseApi.createEventExpense(dummyPayload);
  const deleteId = dummyRes.eventforecastedcostid;

  const startDelete = Date.now();

  const deleteRes = await eventExpenseApi.deleteEventExpenseById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await eventExpenseApi.getEventExpenseById(deleteId);

  expect.soft(deletedCheck?.eventforecastedcostid).toBeUndefined();
});
