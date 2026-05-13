import { test, expect } from '@playwright/test';
import { AccountApi } from '../src/api/AccountApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const accountApi = new AccountApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // 🇬🇧 UK Name Generator
  // =======================
  function generateUKCustomerName(): string {
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

  const name = `${generateUKCustomerName()} ${unique()}`; // ✅ avoid duplicate

  const payload = {
    customer_num: '00000000000',
    custom: {
      customer_name: name,
      customer_phone: `07${Math.floor(100000000 + Math.random() * 900000000)}`,
      customer_email: `user${unique()}@mailinator.com`,
      assign_to: 'Sonam Burbure',
      ownerid: 18,
      createtime: now(),
      modifiedtime: now(),
      customer_address: '123 Main St',
      customer_city: 'Canada',
      customer_post_code: 'M5V 3L9',
      customer_county: 5,
      customer_country: 1
    },
    source: 'web',
    status: '1',
  };

  const createRes = await accountApi.createAccount(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.customerid).toBeDefined();

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await accountApi.getAccount();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.customer_email).toBe(payload.custom.customer_email);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await accountApi.searchAccounts(
    `customer_name=${payload.custom.customer_name}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.customer_name === payload.custom.customer_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.customer_name = generateUKCustomerName(); // ✅ no number
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await accountApi.updateAccount(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await accountApi.searchAccounts(`customer_name=${payload.custom.customer_name}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) => item.customer_name === payload.custom.customer_name);
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      customer_name: `${generateUKCustomerName()} ${unique()}`,
      customer_email: `user${unique()}@mailinator.com`
    }
  };

  const dummyRes = await accountApi.createAccount(dummyPayload);
  const deleteId = dummyRes.customerid;

  const startDelete = Date.now();

  const deleteRes = await accountApi.deleteAccountById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await accountApi.getAccountById(deleteId);

  expect.soft(deletedCheck?.customerid).toBeUndefined();});