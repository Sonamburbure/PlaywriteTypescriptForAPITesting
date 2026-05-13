import { test, expect } from '@playwright/test';
import { EmployeeDocumentsApi } from '../src/api/EmployeeDocumentsApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const employeeDocApi = new EmployeeDocumentsApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const docName = `emp_${unique()} /Identity Proof`; // ✅ avoid duplicate

  const payload = {
    employeedocument_num: '00000000000',
    custom: {
      employeedocument_name: docName,
      related_employee: 4,
      employeedocument_visibility: '815',
      employeedocument_type: 786,
      employeedocument_staus: '792',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    },
    source: 'web',
    status: '1',
  };

  const createRes = await employeeDocApi.createEmployeeDocument(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.employeedocumentid).toBeDefined();
  expect.soft(createRes.employeedocument_name).toBe(payload.custom.employeedocument_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await employeeDocApi.getEmployeeDocument();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.employeedocumentid).toBe(createRes.employeedocumentid);
  expect.soft(getRes.employeedocument_name).toBe(payload.custom.employeedocument_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await employeeDocApi.searchEmployeeDocuments(
    `employeedocument_name=${payload.custom.employeedocument_name}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.employeedocument_name === payload.custom.employeedocument_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.employeedocument_name = `emp_${unique()} /Passport`; // ✅ unique updated name
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await employeeDocApi.updateEmployeeDocument(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await employeeDocApi.searchEmployeeDocuments(
    `employeedocument_name=${payload.custom.employeedocument_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.employeedocument_name === payload.custom.employeedocument_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      employeedocument_name: `emp_${unique()} /Driving Licence`
    }
  };

  const dummyRes = await employeeDocApi.createEmployeeDocument(dummyPayload);
  const deleteId = dummyRes.employeedocumentid;

  const startDelete = Date.now();

  const deleteRes = await employeeDocApi.deleteEmployeeDocumentById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await employeeDocApi.getEmployeeDocumentById(deleteId);

  expect.soft(deletedCheck?.employeedocumentid).toBeUndefined();
});
