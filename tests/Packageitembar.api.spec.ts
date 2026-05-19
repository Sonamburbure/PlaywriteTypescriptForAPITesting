import { test, expect } from '@playwright/test';
import { PackageItemBarApi } from '../src/api/PackageitembarApi.js';

const BAR_PREFIX = [
  'Premium', 'Classic', 'Signature', 'Deluxe',
  'Executive', 'Elite', 'Grand', 'Essential'
];

const BAR_TYPES = [
  'Bar Setup', 'Cocktail Bar', 'Beverage Bar',
  'Open Bar', 'Cash Bar', 'Full Bar'
];

const BAR_TIER = [
  'Gold', 'Silver', 'Platinum', 'Standard', 'Diamond'
];

const MIN_VALUES = ['1.00', '2.00', '3.00', '5.00'];
const MAX_VALUES = ['3.00', '5.00', '8.00', '10.00'];

const PACKAGEITEMBAR_TYPE_IDS = [677, 678];
const RELATED_PACKAGE_IDS = [8];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBarName() {
  return `${getRandom(BAR_PREFIX)} ${getRandom(BAR_TYPES)} ${getRandom(BAR_TIER)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const packageItemBarApi = new PackageItemBarApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const barName = generateBarName();
  const relatedPackage = getRandom(RELATED_PACKAGE_IDS);
  const barType = getRandom(PACKAGEITEMBAR_TYPE_IDS);

  const payload = {
    packageitembar_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      packageitembar_name: barName,
      related_package: relatedPackage,
      packageitembar_category: 675,
      packageitembar_subcategory: '',
      packageitembar_sort_category: '1',
      packageitembar_min: getRandom(MIN_VALUES),
      packageitembar_max: getRandom(MAX_VALUES),
      packageitembar_type: barType,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await packageItemBarApi.createPackageItemBar(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.packageitembarid).toBeDefined();
  expect.soft(createRes.packageitembar_name).toBe(barName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await packageItemBarApi.getPackageItemBar();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.packageitembarid).toBe(createRes.packageitembarid);
  expect.soft(getRes.packageitembar_name).toBe(barName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await packageItemBarApi.searchPackageItemBars(
    `packageitembar_name=${barName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.packageitembar_name === barName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.packageitembar_name = generateBarName();
  payload.custom.packageitembar_type = getRandom(PACKAGEITEMBAR_TYPE_IDS);
  payload.custom.packageitembar_min = getRandom(MIN_VALUES);
  payload.custom.packageitembar_max = getRandom(MAX_VALUES);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await packageItemBarApi.updatePackageItemBar(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await packageItemBarApi.searchPackageItemBars(
    `packageitembar_name=${payload.custom.packageitembar_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.packageitembar_name === payload.custom.packageitembar_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      packageitembar_name: generateBarName(),
      related_package: relatedPackage,
      packageitembar_type: getRandom(PACKAGEITEMBAR_TYPE_IDS.filter(id => id !== barType)),
    }
  };

  const dummyRes = await packageItemBarApi.createPackageItemBar(dummyPayload);
  const deleteId = dummyRes.packageitembarid;

  const startDelete = Date.now();

  const deleteRes = await packageItemBarApi.deletePackageItemBarById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await packageItemBarApi.getPackageItemBarById(deleteId);

  expect.soft(deletedCheck?.packageitembarid).toBeUndefined();
});
