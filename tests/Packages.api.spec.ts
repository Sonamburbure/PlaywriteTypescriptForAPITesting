import { test, expect } from '@playwright/test';
import { PackagesApi } from '../src/api/PackagesApi.js';

const PACKAGE_PREFIX = [
  'Elite', 'Premium', 'Signature', 'Classic',
  'Executive', 'Deluxe', 'Grand', 'Essential'
];

const PACKAGE_TYPES = [
  'Cocktail Package', 'Beverage Package', 'Bar Package',
  'Event Package', 'Catering Package', 'Full Service Package'
];

const PACKAGE_TIER = [
  'Gold', 'Silver', 'Platinum', 'Standard', 'Diamond'
];

const PACKAGE_SUBTITLES = [
  'Ideal for corporate events and large-scale gatherings.',
  'Comprehensive beverage solution for premium events.',
  'Tailored package for elegant dining experiences.',
  'All-inclusive service package for event operations.',
  'Flexible package designed for diverse event requirements.'
];

const FIXED_PRICE_VALUES = ['1000.00', '1500.00', '2000.00', '2500.00', '3000.00'];
const GUEST_PRICE_VALUES = ['5.00', '8.00', '10.00', '12.00', '15.00'];
const DAY_PRICE_VALUES = ['50', '75', '100', '150', '200'];
const HOUR_PRICE_VALUES = ['1.00', '1.50', '2.00', '2.50', '3.00'];
const MIN_PRICE_VALUES = ['0.50', '1.00', '1.50', '2.00'];
const SERVICE_CHARGE_VALUES = ['1', '2', '3', '5'];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePackageName() {
  return `${getRandom(PACKAGE_PREFIX)} ${getRandom(PACKAGE_TYPES)} ${getRandom(PACKAGE_TIER)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const packagesApi = new PackagesApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const packageName = generatePackageName();

  const payload = {
    package_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      package_name: packageName,
      package_subtitle: getRandom(PACKAGE_SUBTITLES),
      package_status: 669,
      package_event_type: [671],
      sort_category: 'sort category',
      package_fixed_price: getRandom(FIXED_PRICE_VALUES),
      package_guest_price: getRandom(GUEST_PRICE_VALUES),
      package_day_price: getRandom(DAY_PRICE_VALUES),
      package_hour_price: getRandom(HOUR_PRICE_VALUES),
      package_minimum_price: getRandom(MIN_PRICE_VALUES),
      package_vat: 673,
      package_service_charge: getRandom(SERVICE_CHARGE_VALUES),
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await packagesApi.createPackage(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.packageid).toBeDefined();
  expect.soft(createRes.package_name).toBe(packageName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await packagesApi.getPackage();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.packageid).toBe(createRes.packageid);
  expect.soft(getRes.package_name).toBe(packageName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await packagesApi.searchPackages(
    `package_name=${packageName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.package_name === packageName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.package_name = generatePackageName();
  payload.custom.package_subtitle = getRandom(PACKAGE_SUBTITLES);
  payload.custom.package_fixed_price = getRandom(FIXED_PRICE_VALUES);
  payload.custom.package_guest_price = getRandom(GUEST_PRICE_VALUES);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await packagesApi.updatePackage(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await packagesApi.searchPackages(
    `package_name=${payload.custom.package_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.package_name === payload.custom.package_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      package_name: generatePackageName(),
      package_event_type: [671],
    }
  };

  const dummyRes = await packagesApi.createPackage(dummyPayload);
  const deleteId = dummyRes.packageid;

  const startDelete = Date.now();

  const deleteRes = await packagesApi.deletePackageById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await packagesApi.getPackageById(deleteId);

  expect.soft(deletedCheck?.packageid).toBeUndefined();
});
