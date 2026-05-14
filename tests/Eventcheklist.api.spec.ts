import { test, expect } from '@playwright/test';
import { EventChecklistApi } from '../src/api/EventcheklistApi.js';

const CHECKLIST_NAMES = [
  'Operational Readiness Verification',
  'Venue Safety Inspection',
  'Catering Setup Confirmation',
  'Staff Briefing Checklist',
  'Equipment Deployment Review',
  'Guest Entry Preparation',
  'Bar Setup Compliance Check',
  'Event Closedown Procedures',
  'Health & Safety Walkthrough',
  'Final Event Readiness Check'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const eventChecklistApi = new EventChecklistApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const checklistName = `${getRandom(CHECKLIST_NAMES)}_${unique()}`;

  const payload = {
    eventchecklist_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventchecklist_name: checklistName,
      related_event: 309,
      related_checklistmaster: 9,
      eventchecklist_type: '801',
      eventchecklist_duedatetime: '2026-04-10 18:25',
      eventchecklist_status: 819,
      eventchecklist_completedon: '2026-04-11 18:26',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await eventChecklistApi.createEventChecklist(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventchecklistid).toBeDefined();
  expect.soft(createRes.eventchecklist_name).toBe(payload.custom.eventchecklist_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await eventChecklistApi.getEventChecklist();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventchecklistid).toBe(createRes.eventchecklistid);
  expect.soft(getRes.eventchecklist_name).toBe(payload.custom.eventchecklist_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await eventChecklistApi.searchEventChecklists(
    `eventchecklist_name=${payload.custom.eventchecklist_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventchecklist_name === payload.custom.eventchecklist_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.eventchecklist_name = `${getRandom(CHECKLIST_NAMES)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await eventChecklistApi.updateEventChecklist(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await eventChecklistApi.searchEventChecklists(
    `eventchecklist_name=${payload.custom.eventchecklist_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventchecklist_name === payload.custom.eventchecklist_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventchecklist_name: `${getRandom(CHECKLIST_NAMES)}_${unique()}`,
    }
  };

  const dummyRes = await eventChecklistApi.createEventChecklist(dummyPayload);
  const deleteId = dummyRes.eventchecklistid;

  const startDelete = Date.now();

  const deleteRes = await eventChecklistApi.deleteEventChecklistById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await eventChecklistApi.getEventChecklistById(deleteId);

  expect.soft(deletedCheck?.eventchecklistid).toBeUndefined();
});
