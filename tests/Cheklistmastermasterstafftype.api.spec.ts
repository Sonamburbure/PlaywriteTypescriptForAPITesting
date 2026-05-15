import { test, expect } from '@playwright/test';
import { ChecklistMasterStaffTypeApi } from '../src/api/CheklistmasterstafftypeApi.js';

const STAFF_TYPE = [
  'Serving Staff',
  'Bartender',
  'Support Staff',
  'Event Supervisor',
  'Floor Manager'
];

const SERVICE_TYPE = [
  'Buffet Service',
  'Table Service',
  'Bar Service',
  'Guest Handling',
  'Food Service'
];

const CHECKLIST_TYPE = [
  'Operational Readiness Verification',
  'Service Setup Checklist',
  'Pre Event Inspection',
  'Execution Checklist',
  'Quality Assurance Checklist'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
  return `${getRandom(STAFF_TYPE)}/${getRandom(SERVICE_TYPE)}/${getRandom(CHECKLIST_TYPE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const checklistStaffTypeApi = new ChecklistMasterStaffTypeApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const staffTypeName = `${generateName()}_${unique()}`;

  const payload = {
    eventcheckliststafftype_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventcheckliststafftype_name: staffTypeName,
      related_checklistmaster: 9,
      related_stafftype: 68,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await checklistStaffTypeApi.createChecklistStaffType(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventcheckliststafftypeid).toBeDefined();
  expect.soft(createRes.eventcheckliststafftype_name).toBe(payload.custom.eventcheckliststafftype_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await checklistStaffTypeApi.getChecklistStaffType();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventcheckliststafftypeid).toBe(createRes.eventcheckliststafftypeid);
  expect.soft(getRes.eventcheckliststafftype_name).toBe(payload.custom.eventcheckliststafftype_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await checklistStaffTypeApi.searchChecklistStaffTypes(
    `eventcheckliststafftype_name=${payload.custom.eventcheckliststafftype_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventcheckliststafftype_name === payload.custom.eventcheckliststafftype_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.eventcheckliststafftype_name = `${generateName()}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await checklistStaffTypeApi.updateChecklistStaffType(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await checklistStaffTypeApi.searchChecklistStaffTypes(
    `eventcheckliststafftype_name=${payload.custom.eventcheckliststafftype_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventcheckliststafftype_name === payload.custom.eventcheckliststafftype_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventcheckliststafftype_name: `${generateName()}_${unique()}`,
    }
  };

  const dummyRes = await checklistStaffTypeApi.createChecklistStaffType(dummyPayload);
  const deleteId = dummyRes.eventcheckliststafftypeid;

  const startDelete = Date.now();

  const deleteRes = await checklistStaffTypeApi.deleteChecklistStaffTypeById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await checklistStaffTypeApi.getChecklistStaffTypeById(deleteId);

  expect.soft(deletedCheck?.eventcheckliststafftypeid).toBeUndefined();
});
