import { test, expect } from '@playwright/test';
import { TaskMasterApi } from '../src/api/TaskMasterApi.js';

const TASK_PREFIX = [
  'Pre-Event', 'On-Site', 'Post-Event', 'Day-Of', 'Setup',
  'Closedown', 'Briefing', 'Inspection', 'Coordination', 'Review'
];

const TASK_TYPE = [
  'Venue Setup', 'Catering Coordination', 'Staff Briefing',
  'Equipment Deployment', 'Guest Management', 'Bar Operations',
  'Safety Compliance', 'Transport Logistics', 'Decor Arrangement',
  'Event Closedown', 'AV Check', 'Supplier Liaison',
  'Parking Management', 'VIP Handling', 'Waste Disposal'
];

const TASK_DESCRIPTIONS = [
  'Coordinate with venue staff to confirm space allocation, layout and setup requirements before event begins',
  'Verify catering quantities, dietary requirements and confirm service timing with the catering team',
  'Brief all event staff on their assigned roles, responsibilities and emergency procedures',
  'Deploy and test all equipment on site and confirm operational readiness before doors open',
  'Manage guest arrivals, oversee seating arrangements and handle any special accommodation requests',
  'Monitor bar inventory levels, manage staff rotation and maintain service standards throughout the event',
  'Conduct full safety walkthrough and verify compliance with venue health and safety regulations',
  'Confirm transport bookings for staff, equipment and supplies and coordinate between locations',
  'Supervise decor installation and verify the setup aligns with the approved client brief',
  'Lead systematic post-event breakdown, complete inventory check and hand over venue to management',
  'Confirm all supplier deliveries have arrived, inspect received items and report any shortfalls',
  'Coordinate parking allocation for guests, vendors and event vehicles to avoid congestion',
  'Manage VIP guest arrival protocols, assign dedicated escorts and oversee exclusive service areas',
  'Oversee waste disposal and recycling operations to ensure compliance with environmental requirements',
  'Conduct audio-visual and technical equipment checks and resolve any issues before event start',
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTaskName() {
  return `${getRandom(TASK_PREFIX)} ${getRandom(TASK_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const taskMasterApi = new TaskMasterApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const taskName = generateTaskName();

  const payload = {
    taskmaster_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      taskmaster_name: taskName,
      taskmaster_category: 640,
      taskmaster_description: getRandom(TASK_DESCRIPTIONS),
      taskmaster_priority: 654,
      taskmaster_dueday: '2',
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
  payload.custom.taskmaster_name = generateTaskName();
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
      taskmaster_name: generateTaskName(),
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
