import { test, expect } from '@playwright/test';
import { ProductVendorApi } from '../src/api/ProductvendorApi.js';

const PRODUCT_TYPES = [
  'Juice', 'Beverage', 'Energy Drink',
  'Soft Drink', 'Mixer', 'Syrup'
];

const SUPPLIER_TYPES = [
  'Supplier', 'Wholesale Supplier', 'Distributor',
  'Vendor', 'Trading Co.', 'Beverage Supplier'
];

const PRICING_VALUES = ['25.00', '35.00', '50.00', '75.00', '100.00'];

const RELATED_PRODUCT_IDS = [361, 362, 363, 364, 365];
const RELATED_SUPPLIER_IDS = [258, 259, 260, 261, 262];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVendorName() {
  return `${getRandom(PRODUCT_TYPES)} ${getRandom(SUPPLIER_TYPES)}`;
}

function generateVendorRef() {
  return `REF_${Date.now()}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const productVendorApi = new ProductVendorApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const vendorName = generateVendorName();
  const relatedProduct = getRandom(RELATED_PRODUCT_IDS);
  const relatedSupplier = getRandom(RELATED_SUPPLIER_IDS);

  const payload = {
    productvendor_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      productvendor_name: vendorName,
      related_product: relatedProduct,
      related_supplier: relatedSupplier,
      vendor_ref: generateVendorRef(),
      case_size: '5',
      min_case_count: '5',
      pricing_per_case: getRandom(PRICING_VALUES),
      purchase_vat: '168',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await productVendorApi.createProductVendor(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.productvendorid).toBeDefined();
  expect.soft(createRes.productvendor_name).toBe(vendorName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await productVendorApi.getProductVendor();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.productvendorid).toBe(createRes.productvendorid);
  expect.soft(getRes.productvendor_name).toBe(vendorName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await productVendorApi.searchProductVendors(
    `productvendor_name=${vendorName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.productvendor_name === vendorName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.productvendor_name = generateVendorName();
  payload.custom.pricing_per_case = getRandom(PRICING_VALUES);
  payload.custom.vendor_ref = generateVendorRef();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await productVendorApi.updateProductVendor(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await productVendorApi.searchProductVendors(
    `productvendor_name=${payload.custom.productvendor_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.productvendor_name === payload.custom.productvendor_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      productvendor_name: generateVendorName(),
      related_product: getRandom(RELATED_PRODUCT_IDS.filter(id => id !== relatedProduct)),
      related_supplier: getRandom(RELATED_SUPPLIER_IDS.filter(id => id !== relatedSupplier)),
      vendor_ref: generateVendorRef(),
    }
  };

  const dummyRes = await productVendorApi.createProductVendor(dummyPayload);
  const deleteId = dummyRes.productvendorid;

  const startDelete = Date.now();

  const deleteRes = await productVendorApi.deleteProductVendorById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await productVendorApi.getProductVendorById(deleteId);

  expect.soft(deletedCheck?.productvendorid).toBeUndefined();
});
