import { test, expect } from '@playwright/test';
import { VenueApi } from '../src/api/VenueApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const venueApi = new VenueApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // 🏙️ UK Venue Name Generator
  // =======================
  function generateUKVenueName(): string {
    const places = [
      'London', 'Manchester', 'Leeds', 'Liverpool', 'Bristol',
      'Nottingham', 'Sheffield', 'Leicester', 'Oxford', 'Cambridge'
    ];

    const place = places[Math.floor(Math.random() * places.length)];
    return `${place} Venue`;
  }

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const venueName = `${generateUKVenueName()} ${unique()}`; // ✅ avoid duplicate

  const payload = {
    venue_num: '00000000000',
    custom: {
      venue_name: venueName,
      venue_phone: '1234456789',
      venue_email: `venue${unique()}@mailinator.com`,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
      venue_address: 'New Street',
      venue_city: 'London',
      venue_post_code: '123456',
      venue_county: 5,
      venue_country: 1,
    },
    source: 'web',
    status: '1',
  };

  const createRes = await venueApi.createVenue(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.venueid).toBeDefined();
  expect.soft(createRes.venue_name).toBe(payload.custom.venue_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await venueApi.getVenue();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.venueid).toBe(createRes.venueid);
  expect.soft(getRes.venue_name).toBe(payload.custom.venue_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await venueApi.searchVenues(
    `venue_name=${payload.custom.venue_name}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.venue_name === payload.custom.venue_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.venue_name = `${generateUKVenueName()} ${unique()}`; // ✅ unique updated name
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await venueApi.updateVenue(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await venueApi.searchVenues(`venue_name=${payload.custom.venue_name}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) => item.venue_name === payload.custom.venue_name);
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      venue_name: `${generateUKVenueName()} ${unique()}`,
      venue_email: `venue${unique()}@mailinator.com`
    }
  };

  const dummyRes = await venueApi.createVenue(dummyPayload);
  const deleteId = dummyRes.venueid;

  const startDelete = Date.now();

  const deleteRes = await venueApi.deleteVenueById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await venueApi.getVenueById(deleteId);

  expect.soft(deletedCheck?.venueid).toBeUndefined();
});
