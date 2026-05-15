import { test, expect } from '@playwright/test';
import { ProductCostingApi } from '../src/api/ProductcostingApi.js';

const COSTING_TYPES = [
  'Standard Costing', 'Average Costing', 'Bulk Costing',
  'Event Costing', 'Inventory Costing', 'Warehouse Costing'
];

const COSTING_LEVELS = [
  'Standard', 'Premium', 'Basic', 'Wholesale', 'Retail'
];

const COST_VALUES = ['2.00', '3.50', '5.00', '7.25', '10.00'];

const RELATED_PRODUCT_IDS = [421, 422, 423, 424, 425];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCostingName() {
  return `${getRandom(COSTING_TYPES)} / ${getRandom(COSTING_LEVELS)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const productCostingApi = new ProductCostingApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const costingName = generateCostingName();
  const cost = getRandom(COST_VALUES);
  const relatedProduct = getRandom(RELATED_PRODUCT_IDS);

  const payload = {
    productcosting_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      productcosting_name: costingName,
      related_product: relatedProduct,
      productcosting_priority: 'first',
      standardcost: cost,
      weighted_avg_cost: cost,
      costing_method: 551,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await productCostingApi.createProductCosting(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.productcostingid).toBeDefined();
  expect.soft(createRes.productcosting_name).toBe(costingName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await productCostingApi.getProductCosting();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.productcostingid).toBe(createRes.productcostingid);
  expect.soft(getRes.productcosting_name).toBe(costingName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await productCostingApi.searchProductCostings(
    `productcosting_name=${costingName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.productcosting_name === costingName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.productcosting_name = generateCostingName();
  payload.custom.standardcost = getRandom(COST_VALUES);
  payload.custom.weighted_avg_cost = payload.custom.standardcost;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await productCostingApi.updateProductCosting(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await productCostingApi.searchProductCostings(
    `productcosting_name=${payload.custom.productcosting_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.productcosting_name === payload.custom.productcosting_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      productcosting_name: generateCostingName(),
      related_product: getRandom(RELATED_PRODUCT_IDS.filter(id => id !== relatedProduct)),
    }
  };

  const dummyRes = await productCostingApi.createProductCosting(dummyPayload);
  const deleteId = dummyRes.productcostingid;

  const startDelete = Date.now();

  const deleteRes = await productCostingApi.deleteProductCostingById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await productCostingApi.getProductCostingById(deleteId);

  expect.soft(deletedCheck?.productcostingid).toBeUndefined();
});
