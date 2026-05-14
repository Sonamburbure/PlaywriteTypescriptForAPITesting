import { test, expect } from '@playwright/test';
import { TaskMasterApi } from '../src/api/TaskMasterApi.js';

const TASK_CATEGORIES = [
  'Venue Setup',
  'Catering Coordination',
  'Staff Briefing',
  'Equipment Deployment',
  'Guest Management',
  'Bar Operations',
  'Safety Compliance',
  'Transport Logistics',
  'Decor Arrangement',
  'Event Closedown'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const taskMasterApi = new TaskMasterApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const taskName = `${getRandom(TASK_CATEGORIES)}_${unique()}`;

  const payload = {
    taskmaster_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      taskmaster_name: taskName,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await taskMasterApi.createTaskMaster(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.taskmasterid).toBeDefined();
  expect.soft(createRes.taskmaster_name).toBe(payload.custom.taskmaster_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await taskMasterApi.getTaskMaster();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.taskmasterid).toBe(createRes.taskmasterid);
  expect.soft(getRes.taskmaster_name).toBe(payload.custom.taskmaster_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await taskMasterApi.searchTaskMasters(
    `taskmaster_name=${payload.custom.taskmaster_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.taskmaster_name === payload.custom.taskmaster_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.taskmaster_name = `${getRandom(TASK_CATEGORIES)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await taskMasterApi.updateTaskMaster(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await taskMasterApi.searchTaskMasters(
    `taskmaster_name=${payload.custom.taskmaster_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.taskmaster_name === payload.custom.taskmaster_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      taskmaster_name: `${getRandom(TASK_CATEGORIES)}_${unique()}`,
    }
  };

  const dummyRes = await taskMasterApi.createTaskMaster(dummyPayload);
  const deleteId = dummyRes.taskmasterid;

  const startDelete = Date.now();

  const deleteRes = await taskMasterApi.deleteTaskMasterById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await taskMasterApi.getTaskMasterById(deleteId);

  expect.soft(deletedCheck?.taskmasterid).toBeUndefined();
});
