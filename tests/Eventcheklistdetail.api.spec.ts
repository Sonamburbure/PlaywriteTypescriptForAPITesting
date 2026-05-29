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

const RELATED_CHECKLIST_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const RELATED_QUESTION_IDS = [48, 49, 50, 51, 52, 53, 54, 55];

function getRandom<T>(arr: T[]): T {
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
      related_checklistmasterquestion: getRandom(RELATED_QUESTION_IDS),
      related_eventchecklist: getRandom(RELATED_CHECKLIST_IDS),
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
  expect.soft(createRes?.eventchecklistresponseid ?? createRes?.id).toBeDefined();

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await eventChecklistDetailApi.getEventChecklistDetail();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  if (getRes) {
    expect.soft(getRes.eventchecklistresponseid ?? getRes.id).toBeDefined();
  }

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
      related_checklistmasterquestion: getRandom(RELATED_QUESTION_IDS.filter(id => id !== payload.custom.related_checklistmasterquestion)),
      related_eventchecklist: getRandom(RELATED_CHECKLIST_IDS.filter(id => id !== payload.custom.related_eventchecklist)),
    }
  };

  await eventChecklistDetailApi.createEventChecklistDetail(dummyPayload);
  const deleteId = eventChecklistDetailApi.getLastCreatedId();

  expect.soft(deleteId).toBeDefined();

  const startDelete = Date.now();

  const deleteRes = await eventChecklistDetailApi.deleteEventChecklistDetailById(deleteId!);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes.body?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await eventChecklistDetailApi.getEventChecklistDetailById(deleteId!);
  expect.soft(deletedCheck?.eventchecklistresponseid).toBeUndefined();
});
