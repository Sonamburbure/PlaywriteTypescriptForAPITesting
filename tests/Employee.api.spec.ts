import { test, expect } from '@playwright/test';
import { EmployeeApi } from '../src/api/EmployeeApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const employeeApi = new EmployeeApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // 🇬🇧 UK Name Generator
  // =======================
  function generateUKEmployeeName(): { first: string; last: string } {
    const firstNames = ["Oliver","George","Harry","Jack","Noah","Olivia","Amelia","Isla","Ava","Emily"];
    const lastNames = ["Smith","Jones","Taylor","Brown","Williams","Wilson","Johnson","Davies","Patel","Wright"];

    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];

    return { first, last };
  }

  function generateUKMobile(): string {
    return `07${Math.floor(100000000 + Math.random() * 900000000)}`;
  }

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const emp = generateUKEmployeeName();
  const email = `${emp.first.toLowerCase()}.${emp.last.toLowerCase()}${unique()}@mailinator.com`;

  const payload = {
    employee_num: '00000000000',
    custom: {
      employee_firstname: emp.first,
      employee_lastname: emp.last,
      employee_eff_start_date: '2026-04-02',
      employee_eff_end_date: '2026-04-03',
      employee_address: 'South Street, London',
      employee_Mobile: generateUKMobile(),
      employee_email: email,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    },
    source: 'web',
    status: '1',
  };

  const createRes = await employeeApi.createEmployee(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(5000);
  expect.soft(createRes.employeeid).toBeDefined();
  expect.soft(createRes.employee_email).toBe(payload.custom.employee_email);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await employeeApi.getEmployee();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.employeeid).toBe(createRes.employeeid);
  expect.soft(getRes.employee_email).toBe(payload.custom.employee_email);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await employeeApi.searchEmployees(
    `employee_email=${payload.custom.employee_email}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.employeeid === createRes.employeeid
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  const updatedEmp = generateUKEmployeeName();
  payload.custom.employee_firstname = updatedEmp.first;
  payload.custom.employee_lastname = updatedEmp.last;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await employeeApi.updateEmployee(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await employeeApi.searchEmployees(`employee_email=${payload.custom.employee_email}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.employeeid === createRes.employeeid &&
    item.employee_firstname === updatedEmp.first &&
    item.employee_lastname === updatedEmp.last
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyEmp = generateUKEmployeeName();
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      employee_firstname: dummyEmp.first,
      employee_lastname: dummyEmp.last,
      employee_email: `${dummyEmp.first.toLowerCase()}.${dummyEmp.last.toLowerCase()}${unique()}@mailinator.com`,
      employee_Mobile: generateUKMobile()
    }
  };

  const dummyRes = await employeeApi.createEmployee(dummyPayload);
  const deleteId = dummyRes.employeeid;

  const startDelete = Date.now();

  const deleteRes = await employeeApi.deleteEmployeeById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await employeeApi.getEmployeeById(deleteId);

  expect.soft(deletedCheck?.employeeid).toBeUndefined();
});
