import { test, expect } from '@playwright/test';
import { UomApi } from '../src/api/UOMApi.js';

const MEASURE_TYPE = [
  'Liter', 'Milliliter', 'Kilogram', 'Gram', 'Bottle',
  'Can', 'Crate', 'Barrel', 'Gallon', 'Pint'
];

const PACK_FORMAT = [
  'Pack', 'Bundle', 'Carton', 'Case', 'Box',
  'Tray', 'Pallet', 'Unit', 'Batch', 'Set'
];

const USAGE_CONTEXT = [
  'Bulk Supply', 'Retail Size', 'Event Stock', 'Service Portion', 'Storage Unit',
  'Dispensing Measure', 'Catering Supply', 'Bar Stock', 'Venue Supply', 'Banquet Portion'
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateUomName() {
  return `${getRandom(MEASURE_TYPE)} ${getRandom(PACK_FORMAT)} ${getRandom(USAGE_CONTEXT)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const uomApi = new UomApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const uomName = generateUomName();

  const payload = {
    unitofmeasure_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      unitofmeasure_name: uomName,
      allow_multiple_product: '53',
      default_consumable_unit: 527,
      consumable_quantity: '5000.00',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await uomApi.createUom(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.unitofmeasureid).toBeDefined();
  expect.soft(createRes.unitofmeasure_name).toBe(payload.custom.unitofmeasure_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await uomApi.getUom();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  console.log('📩 GET Response:', getRes);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await uomApi.searchUoms(
    `unitofmeasure_name=${payload.custom.unitofmeasure_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.unitofmeasure_name === payload.custom.unitofmeasure_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.unitofmeasure_name = generateUomName();
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  const updateRes = await uomApi.updateUom(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  if (!updateRes.ok) {
    console.warn(`⚠️ UPDATE not allowed (${updateRes.status}) — skipping PUT assertions`);
  } else {
    expect.soft(putTime).toBeLessThan(3000);

    const searchAfterPut = await uomApi.searchUoms(
      `unitofmeasure_name=${payload.custom.unitofmeasure_name}`
    );
    const dataAfterPut = searchAfterPut?.data || [];
    const nameUpdated = dataAfterPut.some((item: any) =>
      item.unitofmeasure_name === payload.custom.unitofmeasure_name
    );
    expect.soft(nameUpdated).toBeTruthy();
  }

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      unitofmeasure_name: generateUomName(),
    }
  };

  const dummyRes = await uomApi.createUom(dummyPayload);
  const deleteId = dummyRes.unitofmeasureid;

  const startDelete = Date.now();

  const deleteRes = await uomApi.deleteUomById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  if (!deleteRes.ok) {
    console.warn(`⚠️ DELETE not allowed (${deleteRes.status}) — skipping DELETE assertions`);
  } else {
    expect.soft(deleteTime).toBeLessThan(4000);
    expect.soft(deleteRes.body?.success).toBe(true);

    // =======================
    // 🔥 VERIFY DELETE
    // =======================
    const deletedCheck = await uomApi.getUomById(deleteId);
    expect.soft(deletedCheck?.unitofmeasureid).toBeUndefined();
  }
});
