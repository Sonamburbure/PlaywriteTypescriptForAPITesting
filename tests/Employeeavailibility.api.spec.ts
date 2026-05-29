import { test, expect } from '@playwright/test';
import { EmployeeAvailabilityApi } from '../src/api/EmployeeAvailibilityApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const employeeAvailApi = new EmployeeAvailabilityApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // generates a unique future date offset by unique ms to avoid duplicate entries
  const uniqueDate = () => {
    const d = new Date(Date.now() + Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
    return d.toISOString().split('T')[0];
  };

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const availName = `emp_${unique()} /Confirmed`; // ✅ avoid duplicate

  const payload = {
    employeeavailability_num: '00000000000',
    custom: {
      employeeavailability_name: availName,
      related_event: 254,
      related_employee: 10,
      employeeavailability_date: uniqueDate(),
      employeeavailability_staus: '706',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    },
    source: 'web',
    status: '1',
  };

  const createRes = await employeeAvailApi.createEmployeeAvailability(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.employeeavailabilityid).toBeDefined();
  expect.soft(createRes.employeeavailability_name).toBe(payload.custom.employeeavailability_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await employeeAvailApi.getEmployeeAvailability();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.employeeavailabilityid).toBe(createRes.employeeavailabilityid);
  expect.soft(getRes.employeeavailability_name).toBe(payload.custom.employeeavailability_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await employeeAvailApi.searchEmployeeAvailabilities(
    `employeeavailability_name=${payload.custom.employeeavailability_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.employeeavailability_name === payload.custom.employeeavailability_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.employeeavailability_name = `emp_${unique()} /Unavailable`; // ✅ unique updated name
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await employeeAvailApi.updateEmployeeAvailability(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await employeeAvailApi.searchEmployeeAvailabilities(
    `employeeavailability_name=${payload.custom.employeeavailability_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.employeeavailability_name === payload.custom.employeeavailability_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      employeeavailability_name: `emp_${unique()} /On Leave`
    }
  };

  const dummyRes = await employeeAvailApi.createEmployeeAvailability(dummyPayload);
  const deleteId = dummyRes.employeeavailabilityid;

  const startDelete = Date.now();

  const deleteRes = await employeeAvailApi.deleteEmployeeAvailabilityById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  if (!deleteRes.ok) {
    console.warn(`⚠️ DELETE not allowed (${deleteRes.status}) — skipping DELETE assertions`);
  } else {
    expect.soft(deleteTime).toBeLessThan(4000);
    expect.soft(deleteRes.body?.success).toBe(true);
  }

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await employeeAvailApi.getEmployeeAvailabilityById(deleteId);

  expect.soft(deletedCheck?.employeeavailabilityid).toBeUndefined();
});
