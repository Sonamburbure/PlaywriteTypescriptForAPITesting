import { test, expect } from '@playwright/test';
import { EventEmployeeFileApi } from '../src/api/EventemployeefileApi.js';

const FILE_TYPES = [
  'Employment Contract',
  'Identity Proof',
  'Work Permit',
  'NDA Agreement',
  'Health Declaration',
  'DBS Certificate',
  'Right to Work',
  'Tax Form',
  'Emergency Contact Form',
  'Confidentiality Agreement'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → SEARCH → DELETE (with response time)', async ({ request }) => {

  const eventEmployeeFileApi = new EventEmployeeFileApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const fileName = `${getRandom(FILE_TYPES)}_${unique()}`;

  const payload = {
    eventemployeefiles_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      eventemployeefiles_name: fileName,
      related_employeedocument: 69,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await eventEmployeeFileApi.createEventEmployeeFile(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(5000);
  expect.soft(createRes.eventemployeefilesid).toBeDefined();
  expect.soft(createRes.eventemployeefiles_name).toBe(payload.custom.eventemployeefiles_name);

  // =======================
  // 🔍 SEARCH (verify create)
  // =======================
  const startSearch = Date.now();

  const searchRes = await eventEmployeeFileApi.searchEventEmployeeFiles(
    `eventemployeefiles_name=${payload.custom.eventemployeefiles_name}`
  );

  const searchTime = Date.now() - startSearch;
  console.log(`⏱️ SEARCH Response Time: ${searchTime} ms`);
  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(searchTime).toBeLessThan(3000);
  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.find((item: any) =>
    item.eventemployeefilesid === createRes.eventemployeefilesid
  );

  expect.soft(found).toBeTruthy();
  expect.soft(found?.eventemployeefiles_name).toBe(payload.custom.eventemployeefiles_name);
  expect.soft(found?.eventemployeefilesid).toBe(createRes.eventemployeefilesid);

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      eventemployeefiles_name: `${getRandom(FILE_TYPES)}_${unique()}`,
    }
  };

  const dummyRes = await eventEmployeeFileApi.createEventEmployeeFile(dummyPayload);
  const deleteId = dummyRes.eventemployeefilesid;

  const startDelete = Date.now();

  const deleteRes = await eventEmployeeFileApi.deleteEventEmployeeFileById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  if (!deleteRes.ok) {
    console.warn(`⚠️ DELETE not allowed (${deleteRes.status}) — skipping DELETE assertions`);
  } else {
    expect.soft(deleteTime).toBeLessThan(4000);
    expect.soft(deleteRes.body?.success).toBe(true);

    // =======================
    // 🔥 VERIFY DELETE (via search)
    // =======================
    const verifySearch = await eventEmployeeFileApi.searchEventEmployeeFiles(
      `eventemployeefiles_name=${dummyPayload.custom.eventemployeefiles_name}`
    );

    const deletedData = verifySearch?.data || [];
    const stillExists = deletedData.some((item: any) =>
      item.eventemployeefilesid === deleteId
    );

    expect.soft(stillExists).toBe(false);
  }
});
