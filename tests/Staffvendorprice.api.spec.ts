import { test, expect } from '@playwright/test';
import { StaffVendorPriceApi } from '../src/api/StaffvendorpriceApi.js';

const STAFF_LEVEL = [
  'Senior', 'Junior', 'Experienced',
  'Certified', 'Professional'
];

const STAFF_ROLE = [
  'Bartender', 'Service Staff', 'Event Supervisor',
  'Support Staff', 'Floor Manager'
];

const PRICING_TYPE = [
  'Standard Pricing', 'Event Pricing', 'Weekend Pricing',
  'Holiday Pricing', 'Flexible Pricing'
];

const PRICING_VALUES = ['1.00', '2.00', '5.00', '10.00'];

const RELATED_STAFFVENDOR_IDS = [11, 12, 13, 14, 15];
const RELATED_STEPRATE_IDS = [10, 11, 12, 13, 14];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePriceName() {
  return `${getRandom(STAFF_LEVEL)} ${getRandom(STAFF_ROLE)} ${getRandom(PRICING_TYPE)}_${Date.now()}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const staffVendorPriceApi = new StaffVendorPriceApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const priceName = generatePriceName();
  const relatedStaffVendor = getRandom(RELATED_STAFFVENDOR_IDS);
  const relatedStepRate = getRandom(RELATED_STEPRATE_IDS);

  const payload = {
    staffvendorprice_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      staffvendorprice_name: priceName,
      related_staffvendor: relatedStaffVendor,
      staffvendorprice_venue_group: 599,
      staffvendorprice_pricing_time_uom: getRandom(PRICING_VALUES),
      related_steprate: relatedStepRate,
      staffvendorprice_purchasevat: 601,
      staffvendorprice_odd_hours_charges: '1',
      staffvendorprice_holiday_charges: '1',
      staffvendorprice_weekend_charges: '1',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await staffVendorPriceApi.createStaffVendorPrice(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.staffvendorpriceid).toBeDefined();
  expect.soft(createRes.staffvendorprice_name).toBe(priceName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await staffVendorPriceApi.getStaffVendorPrice();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.staffvendorpriceid).toBe(createRes.staffvendorpriceid);
  expect.soft(getRes.staffvendorprice_name).toBe(priceName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await staffVendorPriceApi.searchStaffVendorPrices(
    `staffvendorprice_name=${priceName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.staffvendorprice_name === priceName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.staffvendorprice_name = generatePriceName();
  payload.custom.staffvendorprice_pricing_time_uom = getRandom(PRICING_VALUES);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await staffVendorPriceApi.updateStaffVendorPrice(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await staffVendorPriceApi.searchStaffVendorPrices(
    `staffvendorprice_name=${payload.custom.staffvendorprice_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.staffvendorprice_name === payload.custom.staffvendorprice_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      staffvendorprice_name: generatePriceName(),
      related_staffvendor: getRandom(RELATED_STAFFVENDOR_IDS.filter(id => id !== relatedStaffVendor)),
      related_steprate: getRandom(RELATED_STEPRATE_IDS.filter(id => id !== relatedStepRate)),
    }
  };

  const dummyRes = await staffVendorPriceApi.createStaffVendorPrice(dummyPayload);
  const deleteId = dummyRes.staffvendorpriceid;

  const startDelete = Date.now();

  const deleteRes = await staffVendorPriceApi.deleteStaffVendorPriceById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await staffVendorPriceApi.getStaffVendorPriceById(deleteId);

  expect.soft(deletedCheck?.staffvendorpriceid).toBeUndefined();
});
