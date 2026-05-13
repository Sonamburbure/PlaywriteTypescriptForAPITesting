import { test, expect } from '@playwright/test';
import { SupplierApi } from '../src/api/SupplierApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const supplierApi = new SupplierApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // 🇬🇧 UK Name Generator
  // =======================
  function generateUKSupplierName(): string {
    const firstNames = ["Oliver","George","Harry","Jack","Noah","Olivia","Amelia","Isla","Ava","Emily"];
    const lastNames = ["Smith","Jones","Taylor","Brown","Williams","Wilson","Johnson","Davies","Patel","Wright"];

    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${first} ${last}`;
  }

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const name = `${generateUKSupplierName()} ${unique()}`; // ✅ avoid duplicate

  const payload = {
    supplier_num: '00000000000',
    custom: {
      supplier_name: name,
      supplier_status: 193,
      supplier_category: 195,
      supplier_rating: 197,
      ownerid: 18,
      createtime: now(),
      modifiedtime: now(),
      supplier_address: 'abc',
      supplier_city: 'birmingham',
      supplier_post_code: '1234556',
      supplier_county: 2,
      supplier_country: 1,
      assign_to: 'Sonam Burbure'
    },
    source: 'web',
    status: '1',
  };

  const createRes = await supplierApi.createSupplier(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.supplierid).toBeDefined();
  expect.soft(createRes.supplier_name).toBe(payload.custom.supplier_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await supplierApi.getSupplier();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.supplierid).toBe(createRes.supplierid);
  expect.soft(getRes.supplier_name).toBe(payload.custom.supplier_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await supplierApi.searchSuppliers(
    `supplier_name=${payload.custom.supplier_name}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.supplier_name === payload.custom.supplier_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.supplier_name = generateUKSupplierName(); // ✅ no number
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await supplierApi.updateSupplier(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await supplierApi.searchSuppliers(`supplier_name=${payload.custom.supplier_name}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) => item.supplier_name === payload.custom.supplier_name);
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      supplier_name: `${generateUKSupplierName()} ${unique()}`
    }
  };

  const dummyRes = await supplierApi.createSupplier(dummyPayload);
  const deleteId = dummyRes.supplierid;

  const startDelete = Date.now();

  const deleteRes = await supplierApi.deleteSupplierById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await supplierApi.getSupplierById(deleteId);

  expect.soft(deletedCheck?.supplierid).toBeUndefined();
});
