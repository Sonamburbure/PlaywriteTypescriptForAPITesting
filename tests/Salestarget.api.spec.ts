import { test, expect } from '@playwright/test';
import { SalesTargetApi } from '../src/api/SalesTargetApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const salesTargetApi = new SalesTargetApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const payload = {
    salestarget_num: '00000000000',
    custom: {
      sales_person: '18',
      sales_target: '5000000',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    },
    source: 'web',
    status: '1',
  };

  const createRes = await salesTargetApi.createSalesTarget(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.salestargetid).toBeDefined();
  expect.soft(createRes.sales_target).toBe(payload.custom.sales_target);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await salesTargetApi.getSalesTarget();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.salestargetid).toBe(createRes.salestargetid);
  expect.soft(getRes.sales_target).toBe(payload.custom.sales_target);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await salesTargetApi.searchSalesTargets(
    `sales_person=${payload.custom.sales_person}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.salestargetid === createRes.salestargetid
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.sales_target = '7500000'; // ✅ updated target amount
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await salesTargetApi.updateSalesTarget(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await salesTargetApi.searchSalesTargets(`sales_person=${payload.custom.sales_person}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const targetUpdated = dataAfterPut.some((item: any) =>
    item.salestargetid === createRes.salestargetid && item.sales_target === payload.custom.sales_target
  );
  expect.soft(targetUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      sales_target: '1000000'
    }
  };

  const dummyRes = await salesTargetApi.createSalesTarget(dummyPayload);
  const deleteId = dummyRes.salestargetid;

  const startDelete = Date.now();

  const deleteRes = await salesTargetApi.deleteSalesTargetById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await salesTargetApi.getSalesTargetById(deleteId);

  expect.soft(deletedCheck?.salestargetid).toBeUndefined();
});
