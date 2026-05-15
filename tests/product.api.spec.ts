import { test, expect } from '@playwright/test';
import { ProductApi } from '../src/api/ProductsApi.js';

const PRODUCT_PREFIX = [
  'Premium', 'Classic', 'Fresh', 'Organic',
  'Signature', 'Deluxe', 'Elite', 'Pure'
];

const PRODUCT_ITEMS = [
  'Orange Juice', 'Apple Juice', 'Mango Drink', 'Mixed Fruit Juice',
  'Energy Drink', 'Cold Coffee', 'Lemonade', 'Iced Tea'
];

const PRODUCT_PACK = [
  '1L Bottle', '2L Bottle', '5L Container',
  '500ml Pack', 'Bulk Pack', 'Family Pack'
];

const PRODUCT_DESCRIPTIONS = [
  'High-quality beverage product suitable for events and bulk consumption.',
  'Carefully processed drink with consistent taste and premium quality.',
  'Ideal for catering services and large-scale event operations.',
  'Prepared using quality ingredients ensuring freshness and taste.',
  'Reliable product designed for professional event usage.'
];

const RELATED_SEGMENT1_IDS = [41, 211, 259, 260, 275];
const RELATED_UOM_IDS = [15, 182, 185, 186, 527];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProductName() {
  return `${getRandom(PRODUCT_PREFIX)} ${getRandom(PRODUCT_ITEMS)} ${getRandom(PRODUCT_PACK)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const productApi = new ProductApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const productName = generateProductName();
  const relatedSegment1 = getRandom(RELATED_SEGMENT1_IDS);
  const relatedUom = getRandom(RELATED_UOM_IDS);

  const payload = {
    product_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      product_name: productName,
      serial_batch: 207,
      product_category: '1187',
      related_segment1: relatedSegment1,
      safety_stock: 5,
      product_subcategory: '',
      product_status: 546,
      related_unitofmeasure: relatedUom,
      sales_vat: 548,
      manufacturer_name: 'John',
      product_description: getRandom(PRODUCT_DESCRIPTIONS),
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await productApi.createProduct(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.productid).toBeDefined();
  expect.soft(createRes.product_name).toBe(productName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await productApi.getProduct();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.productid).toBe(createRes.productid);
  expect.soft(getRes.product_name).toBe(productName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await productApi.searchProducts(
    `product_name=${productName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.product_name === productName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.product_name = generateProductName();
  payload.custom.product_description = getRandom(PRODUCT_DESCRIPTIONS);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await productApi.updateProduct(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await productApi.searchProducts(
    `product_name=${payload.custom.product_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.product_name === payload.custom.product_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      product_name: generateProductName(),
      related_segment1: getRandom(RELATED_SEGMENT1_IDS.filter(id => id !== relatedSegment1)),
    }
  };

  const dummyRes = await productApi.createProduct(dummyPayload);
  const deleteId = dummyRes.productid;

  const startDelete = Date.now();

  const deleteRes = await productApi.deleteProductById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await productApi.getProductById(deleteId);

  expect.soft(deletedCheck?.productid).toBeUndefined();
});
