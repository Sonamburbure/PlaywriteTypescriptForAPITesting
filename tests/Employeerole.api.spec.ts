import { test, expect } from '@playwright/test';
import { EmployeeRoleApi } from '../src/api/EmployeeRoleApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const employeeRoleApi = new EmployeeRoleApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  const uniqueDatePair = () => {
    const start = new Date(Date.now() + Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const roleName = `Supervise_${unique()}`;
  const dates = uniqueDatePair();

  const payload = {
    employeerole_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      employeerole_name: roleName,
      related_employee: 12,
      employeerole_eff_start_date: dates.start,
      employeerole_eff_end_date: dates.end,
      related_staffcosting: 25,
      employeerole_venue_group: [585],
      employeerole_pricing_time_uom: '500.00',
      related_steprate: 12,
      employeerole_odd_hours_charges: '1',
      employeerole_holiday_charges: '1',
      employeerole_weekend_charges: '1',
      employeerole_inc_holiday_pay: [587],
      employeerole_percent_holiday_pay: '3',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await employeeRoleApi.createEmployeeRole(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.employeeroleid).toBeDefined();
  expect.soft(createRes.employeerole_name).toBe(payload.custom.employeerole_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await employeeRoleApi.getEmployeeRole();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.employeeroleid).toBe(createRes.employeeroleid);
  expect.soft(getRes.employeerole_name).toBe(payload.custom.employeerole_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await employeeRoleApi.searchEmployeeRoles(
    `employeerole_name=${payload.custom.employeerole_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.employeerole_name === payload.custom.employeerole_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.employeerole_name = `Supervisor_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await employeeRoleApi.updateEmployeeRole(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await employeeRoleApi.searchEmployeeRoles(
    `employeerole_name=${payload.custom.employeerole_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.employeerole_name === payload.custom.employeerole_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyDates = uniqueDatePair();
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      employeerole_name: `TempRole_${unique()}`,
      employeerole_eff_start_date: dummyDates.start,
      employeerole_eff_end_date: dummyDates.end,
    }
  };

  const dummyRes = await employeeRoleApi.createEmployeeRole(dummyPayload);
  const deleteId = dummyRes.employeeroleid;

  const startDelete = Date.now();

  const deleteRes = await employeeRoleApi.deleteEmployeeRoleById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await employeeRoleApi.getEmployeeRoleById(deleteId);

  expect.soft(deletedCheck?.employeeroleid).toBeUndefined();
});
