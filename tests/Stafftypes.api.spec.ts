import { test, expect } from '@playwright/test';
import { StaffTypeApi } from '../src/api/StaffTypesApi.js';

const STAFF_PREFIX = [
  'Senior', 'Junior', 'Professional',
  'Certified', 'Experienced'
];

const STAFF_ROLES = [
  'Bartender', 'Service Staff', 'Event Supervisor',
  'Support Staff', 'Floor Manager'
];

const STAFF_CATEGORY = [
  'Count Based', 'Hourly', 'Event Based', 'Shift Based'
];

const STAFF_DESCRIPTIONS = [
  'Responsible for handling assigned duties during events with efficiency and professionalism.',
  'Supports event operations by ensuring smooth service and coordination with the team.',
  'Trained staff allocated based on event requirements and service standards.',
  'Ensures timely execution of assigned responsibilities during event operations.',
  'Provides reliable service support aligned with operational and customer expectations.'
];

const STAFFTYPE_CATEGORY_IDS = [589, 590, 1024, 1025, 1026, 1027, 1028, 1029, 1030];

const RELATED_SEGMENT1_IDS = [41, 157, 211, 259, 289];
const RELATED_UOM_IDS = [15, 182, 185, 186, 527];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStaffName() {
  return `${getRandom(STAFF_PREFIX)} ${getRandom(STAFF_ROLES)} ${getRandom(STAFF_CATEGORY)}_${Date.now()}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const staffTypeApi = new StaffTypeApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const staffName = generateStaffName();
  const relatedSegment1 = getRandom(RELATED_SEGMENT1_IDS);
  const relatedUom = getRandom(RELATED_UOM_IDS);
  const staffCategory = getRandom(STAFFTYPE_CATEGORY_IDS);

  const payload = {
    stafftype_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      stafftype_name: staffName,
      stafftype_category: staffCategory,
      stafftype_subcategory: '',
      stafftype_status: 596,
      related_segment1: relatedSegment1,
      related_unitofmeasure: relatedUom,
      stafftype_priority: 'first',
      stafftype_description: getRandom(STAFF_DESCRIPTIONS),
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await staffTypeApi.createStaffType(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(30000);
  expect.soft(createRes.stafftypeid).toBeDefined();
  expect.soft(createRes.stafftype_name).toBe(staffName);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await staffTypeApi.getStaffType();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.stafftypeid).toBe(createRes.stafftypeid);
  expect.soft(getRes.stafftype_name).toBe(staffName);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await staffTypeApi.searchStaffTypes(
    `stafftype_name=${staffName}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.stafftype_name === staffName
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.stafftype_name = generateStaffName();
  payload.custom.stafftype_description = getRandom(STAFF_DESCRIPTIONS);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await staffTypeApi.updateStaffType(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await staffTypeApi.searchStaffTypes(
    `stafftype_name=${payload.custom.stafftype_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.stafftype_name === payload.custom.stafftype_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      stafftype_name: generateStaffName(),
      related_segment1: getRandom(RELATED_SEGMENT1_IDS.filter(id => id !== relatedSegment1)),
    }
  };

  const dummyRes = await staffTypeApi.createStaffType(dummyPayload);
  const deleteId = dummyRes.stafftypeid;

  const startDelete = Date.now();

  const deleteRes = await staffTypeApi.deleteStaffTypeById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await staffTypeApi.getStaffTypeById(deleteId);

  expect.soft(deletedCheck?.stafftypeid).toBeUndefined();
});
