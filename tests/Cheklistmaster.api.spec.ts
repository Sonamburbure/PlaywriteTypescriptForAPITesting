import { test, expect } from '@playwright/test';
import { ChecklistMasterApi } from '../src/api/CheklistmasterApi.js';

const CHECKLIST_CATEGORY = [
  'Event Preparation',
  'Operational Readiness',
  'Service Setup',
  'Quality Assurance',
  'Pre Event Planning',
  'Execution Checklist',
  'Venue Preparation',
  'Staff Coordination'
];

const CHECKLIST_TYPE = [
  'Checklist',
  'Verification',
  'Inspection',
  'Guidelines',
  'Procedure'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const checklistMasterApi = new ChecklistMasterApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const checklistName = `${getRandom(CHECKLIST_CATEGORY)} ${getRandom(CHECKLIST_TYPE)}_${unique()}`;

  const payload = {
    checklistmaster_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      checklistmaster_name: checklistName,
      checklistmaster_type: 800,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await checklistMasterApi.createChecklistMaster(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.checklistmasterid).toBeDefined();
  expect.soft(createRes.checklistmaster_name).toBe(payload.custom.checklistmaster_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await checklistMasterApi.getChecklistMaster();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.checklistmasterid).toBe(createRes.checklistmasterid);
  expect.soft(getRes.checklistmaster_name).toBe(payload.custom.checklistmaster_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await checklistMasterApi.searchChecklistMasters(
    `checklistmaster_name=${payload.custom.checklistmaster_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.checklistmaster_name === payload.custom.checklistmaster_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.checklistmaster_name = `${getRandom(CHECKLIST_CATEGORY)} ${getRandom(CHECKLIST_TYPE)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await checklistMasterApi.updateChecklistMaster(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await checklistMasterApi.searchChecklistMasters(
    `checklistmaster_name=${payload.custom.checklistmaster_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.checklistmaster_name === payload.custom.checklistmaster_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      checklistmaster_name: `${getRandom(CHECKLIST_CATEGORY)} ${getRandom(CHECKLIST_TYPE)}_${unique()}`,
    }
  };

  const dummyRes = await checklistMasterApi.createChecklistMaster(dummyPayload);
  const deleteId = dummyRes.checklistmasterid;

  const startDelete = Date.now();

  const deleteRes = await checklistMasterApi.deleteChecklistMasterById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await checklistMasterApi.getChecklistMasterById(deleteId);

  expect.soft(deletedCheck?.checklistmasterid).toBeUndefined();
});
