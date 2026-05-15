import { test, expect } from '@playwright/test';
import { ChecklistMasterDetailApi } from '../src/api/CheklistmasterdetailApi.js';

const CHECKLIST_QUESTIONS = [
  'Is the venue setup completed as per the event requirements?',
  'Are all required staff members present and assigned roles?',
  'Has the equipment been checked and verified for functionality?',
  'Are all safety protocols reviewed and implemented?',
  'Is the bar setup completed and ready for service?',
  'Have all inventory items been received and verified?',
  'Is the event area clean and prepared for guests?',
  'Are all necessary permissions and approvals in place?',
  'Has the checklist been reviewed by the event supervisor?',
  'Are backup arrangements available in case of contingencies?'
];

const DROPDOWN_OPTIONS = [
  'Yes,No',
  'Completed,Pending',
  'Approved,Rejected',
  'Available,Not Available'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const checklistDetailApi = new ChecklistMasterDetailApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const questionName = `${getRandom(CHECKLIST_QUESTIONS)}_${unique()}`;

  const payload = {
    checklistmasterquestion_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      checklistmasterquestion_name: questionName,
      related_checklistmaster: 9,
      checklistmasterquestion_question_type: 803,
      checklistmasterquestion_dropdown_values: getRandom(DROPDOWN_OPTIONS),
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await checklistDetailApi.createChecklistMasterDetail(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.checklistmasterquestionid).toBeDefined();
  expect.soft(createRes.checklistmasterquestion_name).toBe(payload.custom.checklistmasterquestion_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await checklistDetailApi.getChecklistMasterDetail();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.checklistmasterquestionid).toBe(createRes.checklistmasterquestionid);
  expect.soft(getRes.checklistmasterquestion_name).toBe(payload.custom.checklistmasterquestion_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await checklistDetailApi.searchChecklistMasterDetails(
    `checklistmasterquestion_name=${payload.custom.checklistmasterquestion_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.checklistmasterquestion_name === payload.custom.checklistmasterquestion_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.checklistmasterquestion_name = `${getRandom(CHECKLIST_QUESTIONS)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await checklistDetailApi.updateChecklistMasterDetail(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await checklistDetailApi.searchChecklistMasterDetails(
    `checklistmasterquestion_name=${payload.custom.checklistmasterquestion_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.checklistmasterquestion_name === payload.custom.checklistmasterquestion_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      checklistmasterquestion_name: `${getRandom(CHECKLIST_QUESTIONS)}_${unique()}`,
    }
  };

  const dummyRes = await checklistDetailApi.createChecklistMasterDetail(dummyPayload);
  const deleteId = dummyRes.checklistmasterquestionid;

  const startDelete = Date.now();

  const deleteRes = await checklistDetailApi.deleteChecklistMasterDetailById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await checklistDetailApi.getChecklistMasterDetailById(deleteId);

  expect.soft(deletedCheck?.checklistmasterquestionid).toBeUndefined();
});
