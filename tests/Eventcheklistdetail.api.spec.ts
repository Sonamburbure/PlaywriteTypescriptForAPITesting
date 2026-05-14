import { test, expect } from '@playwright/test';
import { EventChecklistdetailApi } from '../src/api/EventcheklistdetailApi.js';

const CHECKLIST_QUESTIONS = [
  'Are all required staff members present and assigned roles?',
  'Has the venue been inspected for safety compliance?',
  'Is all catering equipment set up and operational?',
  'Have all guest entry points been confirmed and secured?',
  'Is the bar setup complete and stocked as per requirements?',
  'Have emergency exit routes been checked and cleared?',
  'Are all AV and lighting systems tested and functioning?',
  'Has the event schedule been distributed to all team leads?',
  'Are all delivery items received and checked against order?',
  'Has the final headcount been confirmed with the client?'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const eventChecklistDetailApi = new EventChecklistdetailApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const responseName = `${getRandom(CHECKLIST_QUESTIONS)}_${unique()}`;

  const payload = {
    eventchecklistresponse_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventchecklistresponse_name: responseName,
      related_checklistmasterquestion: 50,
      related_eventchecklist: 3,
      eventchecklistresponse_response: 'Confirmed',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await eventChecklistDetailApi.createEventChecklistDetail(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.eventchecklistresponseid).toBeDefined();
  expect.soft(createRes.eventchecklistresponse_name).toBe(payload.custom.eventchecklistresponse_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await eventChecklistDetailApi.getEventChecklistDetail();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.eventchecklistresponseid).toBe(createRes.eventchecklistresponseid);
  expect.soft(getRes.eventchecklistresponse_name).toBe(payload.custom.eventchecklistresponse_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await eventChecklistDetailApi.searchEventChecklistDetails(
    `eventchecklistresponse_name=${payload.custom.eventchecklistresponse_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.eventchecklistresponse_name === payload.custom.eventchecklistresponse_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.eventchecklistresponse_name = `${getRandom(CHECKLIST_QUESTIONS)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await eventChecklistDetailApi.updateEventChecklistDetail(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await eventChecklistDetailApi.searchEventChecklistDetails(
    `eventchecklistresponse_name=${payload.custom.eventchecklistresponse_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.eventchecklistresponse_name === payload.custom.eventchecklistresponse_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventchecklistresponse_name: `${getRandom(CHECKLIST_QUESTIONS)}_${unique()}`,
    }
  };

  const dummyRes = await eventChecklistDetailApi.createEventChecklistDetail(dummyPayload);
  const deleteId = dummyRes.eventchecklistresponseid;

  const startDelete = Date.now();

  const deleteRes = await eventChecklistDetailApi.deleteEventChecklistDetailById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await eventChecklistDetailApi.getEventChecklistDetailById(deleteId);

  expect.soft(deletedCheck?.eventchecklistresponseid).toBeUndefined();
});
