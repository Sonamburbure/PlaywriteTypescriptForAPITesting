import { test, expect } from '@playwright/test';
import { VenueBarApi } from '../src/api/VenubarApi.js';

const BAR_TYPE = [
  'Main Bar', 'Cocktail Bar', 'Service Bar', 'Premium Bar', 'VIP Bar',
  'Pool Bar', 'Garden Bar', 'Lounge Bar', 'Sports Bar', 'Rooftop Bar'
];

const BAR_STYLE = [
  'Classic Setup', 'Modern Setup', 'Luxury Setup', 'Compact Setup', 'Outdoor Setup',
  'Rustic Setup', 'Minimalist Setup', 'Themed Setup', 'Pop-up Setup', 'Mobile Setup'
];

const EVENT_CONTEXT = [
  'Wedding', 'Corporate Event', 'Private Party', 'Reception', 'Celebration',
  'Gala Dinner', 'Birthday', 'Anniversary', 'Charity Event', 'Conference'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBarName() {
  return `${getRandom(EVENT_CONTEXT)} ${getRandom(BAR_TYPE)} ${getRandom(BAR_STYLE)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const venueBarApi = new VenueBarApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const barName = `${generateBarName()}_${unique()}`;

  const payload = {
    venuebar_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      venuebar_name: barName,
      related_venue: 340,
      related_barsetup: 40,
      venuebar_addonbarsetup: 4,
      related_eventmenu: 1,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await venueBarApi.createVenueBar(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.venuebarid).toBeDefined();
  expect.soft(createRes.venuebar_name).toBe(payload.custom.venuebar_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await venueBarApi.getVenueBar();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.venuebarid).toBe(createRes.venuebarid);
  expect.soft(getRes.venuebar_name).toBe(payload.custom.venuebar_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await venueBarApi.searchVenueBars(
    `venuebar_name=${payload.custom.venuebar_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.venuebar_name === payload.custom.venuebar_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.venuebar_name = `${generateBarName()}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await venueBarApi.updateVenueBar(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await venueBarApi.searchVenueBars(
    `venuebar_name=${payload.custom.venuebar_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.venuebar_name === payload.custom.venuebar_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      venuebar_name: `${generateBarName()}_${unique()}`,
    }
  };

  const dummyRes = await venueBarApi.createVenueBar(dummyPayload);
  const deleteId = dummyRes.venuebarid;

  const startDelete = Date.now();

  const deleteRes = await venueBarApi.deleteVenueBarById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await venueBarApi.getVenueBarById(deleteId);

  expect.soft(deletedCheck?.venuebarid).toBeUndefined();
});
