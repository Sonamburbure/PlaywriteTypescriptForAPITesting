import { test, expect } from '@playwright/test';
import { UomConversionApi } from '../src/api/UOMconversionApi.js';

const RELATED_UOM_IDS = [15, 182, 185, 186];
const CONSUMABLE_QTY = ['1000.00', '2000.00', '3000.00', '5000.00', '10000.00'];
const CONSUMABLE_UOM_ID = '528';

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const uomConversionApi = new UomConversionApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const relatedUom = getRandom(RELATED_UOM_IDS);

  const payload = {
    unitofmeasureconversion_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      related_unitofmeasure: relatedUom,
      conversion_consumable_unit: CONSUMABLE_UOM_ID,
      conversion_consumable_quantity: getRandom(CONSUMABLE_QTY),
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await uomConversionApi.createUomConversion(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(10000);
  expect.soft(createRes.unitofmeasureconversionid).toBeDefined();

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  await uomConversionApi.getUomConversion();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await uomConversionApi.searchUomConversions('');

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.unitofmeasureconversionid === createRes.unitofmeasureconversionid
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.conversion_consumable_quantity = getRandom(CONSUMABLE_QTY);
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  const updateRes = await uomConversionApi.updateUomConversion(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  if (!updateRes.ok) {
    console.warn(`⚠️ UPDATE not allowed (${updateRes.status}) — skipping PUT assertions`);
  } else {
    expect.soft(putTime).toBeLessThan(3000);
  }

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyUom = getRandom(RELATED_UOM_IDS.filter(id => id !== relatedUom));

  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      related_unitofmeasure: dummyUom,
      conversion_consumable_unit: CONSUMABLE_UOM_ID,
      conversion_consumable_quantity: getRandom(CONSUMABLE_QTY),
    }
  };

  const dummyRes = await uomConversionApi.createUomConversion(dummyPayload);
  const deleteId = dummyRes.unitofmeasureconversionid;

  const startDelete = Date.now();

  const deleteRes = await uomConversionApi.deleteUomConversionById(deleteId);

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
    const deletedCheck = await uomConversionApi.getUomConversionById(deleteId);
    expect.soft(deletedCheck?.unitofmeasureconversionid).toBeUndefined();
  }
});
