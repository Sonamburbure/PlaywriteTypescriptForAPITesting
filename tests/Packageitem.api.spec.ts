import { test, expect } from '@playwright/test';
import { PackageItemApi } from '../src/api/PackageitemApi.js';

const ITEM_PREFIX = [
  'Premium', 'Classic', 'Signature', 'Deluxe',
  'Executive', 'Elite', 'Grand', 'Essential'
];

const ITEM_TYPES = [
  'Cocktail Item', 'Beverage Item', 'Bar Item',
  'Drink Item', 'Service Item', 'Menu Item'
];

const ITEM_TIER = [
  'Gold', 'Silver', 'Platinum', 'Standard', 'Diamond'
];

const CONV_PERSON_HOUR_VALUES = ['0.50', '1.00', '1.50', '2.00', '2.50'];
const CONV_PERSON_VALUES = ['0.00', '0.50', '1.00', '1.50'];

const PACKAGEITEM_TYPE_IDS = [677, 678];
const RELATED_PACKAGEITEMBAR_IDS = [3];

const MODULE_RECORDS: Record<string, number[]> = {
  itemserved:         [49, 50, 51, 52, 53, 54, 55],
  itemproduct:        [1, 2, 3, 4, 5],
  itemequipment:      [1, 2, 3, 4, 5],
  itemstaff:          [1, 2, 3, 4, 5],
  barsetup:           [1, 2, 3, 4, 5],
  barsetupproduct:    [1, 2, 3, 4, 5],
  barsetupequipment:  [1, 2, 3, 4, 5],
  barsetupstaff:      [1, 2, 3, 4, 5],
};

const MODULES = Object.keys(MODULE_RECORDS);

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateItemName() {
  return `${getRandom(ITEM_PREFIX)} ${getRandom(ITEM_TYPES)} ${getRandom(ITEM_TIER)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const packageItemApi = new PackageItemApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const itemName = generateItemName();
  const itemType = getRandom(PACKAGEITEM_TYPE_IDS);
  const selectedModule = getRandom(MODULES);
  const selectedRecord = getRandom(MODULE_RECORDS[selectedModule]);

  console.log(`🔀 Selected module: ${selectedModule}, record: ${selectedRecord}`);

  const payload = {
    packageitem_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      packageitem_name: itemName,
      related_packageitembar: getRandom(RELATED_PACKAGEITEMBAR_IDS),
      packageitem_type: itemType,
      packageitemfrom_multiple_record: selectedRecord,
      packageitemfrom_multiple_module: selectedModule,
      packageitem_sort_category: '1',
      packageitem_conv_person_hour: getRandom(CONV_PERSON_HOUR_VALUES),
      packageitem_conv_person: getRandom(CONV_PERSON_VALUES),
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await packageItemApi.createPackageItem(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.packageitemid).toBeDefined();
  expect.soft(createRes.packageitem_name).toBe(itemName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await packageItemApi.getPackageItem();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.packageitemid).toBe(createRes.packageitemid);
  expect.soft(getRes.packageitem_name).toBe(itemName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await packageItemApi.searchPackageItems(
    `packageitem_name=${itemName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.packageitem_name === itemName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  const updatedModule = getRandom(MODULES);
  const updatedRecord = getRandom(MODULE_RECORDS[updatedModule]);

  payload.custom.packageitem_name = generateItemName();
  payload.custom.packageitem_type = getRandom(PACKAGEITEM_TYPE_IDS);
  payload.custom.packageitemfrom_multiple_module = updatedModule;
  payload.custom.packageitemfrom_multiple_record = updatedRecord;
  payload.custom.packageitem_conv_person_hour = getRandom(CONV_PERSON_HOUR_VALUES);
  payload.custom.packageitem_conv_person = getRandom(CONV_PERSON_VALUES);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await packageItemApi.updatePackageItem(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await packageItemApi.searchPackageItems(
    `packageitem_name=${payload.custom.packageitem_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.packageitem_name === payload.custom.packageitem_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyModule = getRandom(MODULES);
  const dummyRecord = getRandom(MODULE_RECORDS[dummyModule]);

  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      packageitem_name: generateItemName(),
      packageitem_type: getRandom(PACKAGEITEM_TYPE_IDS.filter(id => id !== itemType)),
      packageitemfrom_multiple_module: dummyModule,
      packageitemfrom_multiple_record: dummyRecord,
    }
  };

  const dummyRes = await packageItemApi.createPackageItem(dummyPayload);
  const deleteId = dummyRes.packageitemid;

  const startDelete = Date.now();

  const deleteRes = await packageItemApi.deletePackageItemById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await packageItemApi.getPackageItemById(deleteId);

  expect.soft(deletedCheck?.packageitemid).toBeUndefined();
});
