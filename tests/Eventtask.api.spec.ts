import { test, expect } from '@playwright/test';
import { EventTaskApi } from '../src/api/EventTasksApi.js';

const ACTION = [
  'Prepare', 'Arrange', 'Verify', 'Coordinate', 'Finalize',
  'Confirm', 'Review', 'Organise', 'Allocate', 'Schedule'
];
const AREA = [
  'Catering', 'Guest List', 'Venue', 'Staff', 'Logistics',
  'Bar Setup', 'Equipment', 'Transport', 'Security', 'Decor'
];
const CONTEXT = [
  'Setup', 'Arrangement', 'Planning', 'Execution', 'Checklist',
  'Brief', 'Handover', 'Inspection', 'Deployment', 'Review'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTaskName() {
  return `${getRandom(ACTION)} ${getRandom(AREA)} ${getRandom(CONTEXT)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const eventTaskApi = new EventTaskApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const taskName = generateTaskName();

  const payload = {
    eventtask_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventtask_name: taskName,
      related_event: 254,
      eventtask_task_category: 640,
      eventtask_task_desciption: 'Description',
      eventtask_priority: 654,
      eventtask_status: '681',
      eventtask_duedate: '2026-04-30',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await eventTaskApi.createEventTask(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventtaskid).toBeDefined();
  expect.soft(createRes.eventtask_name).toBe(payload.custom.eventtask_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await eventTaskApi.getEventTask();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventtaskid).toBe(createRes.eventtaskid);
  expect.soft(getRes.eventtask_name).toBe(payload.custom.eventtask_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await eventTaskApi.searchEventTasks(
    `eventtask_name=${payload.custom.eventtask_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventtask_name === payload.custom.eventtask_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.eventtask_name = generateTaskName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await eventTaskApi.updateEventTask(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await eventTaskApi.searchEventTasks(
    `eventtask_name=${payload.custom.eventtask_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventtask_name === payload.custom.eventtask_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventtask_name: generateTaskName(),
    }
  };

  const dummyRes = await eventTaskApi.createEventTask(dummyPayload);
  const deleteId = dummyRes.eventtaskid;

  const startDelete = Date.now();

  const deleteRes = await eventTaskApi.deleteEventTaskById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await eventTaskApi.getEventTaskById(deleteId);

  expect.soft(deletedCheck?.eventtaskid).toBeUndefined();
});
