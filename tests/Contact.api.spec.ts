import { test, expect } from '@playwright/test';
import { ContactApi } from '../src/api/ContactApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const contactApi = new ContactApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // 🇬🇧 UK Name Generator
  // =======================
  function generateUKContactName(): { first: string; last: string; full: string } {
    const firstNames = ["Oliver","George","Harry","Jack","Noah","Olivia","Amelia","Isla","Ava","Emily"];
    const lastNames = ["Smith","Jones","Taylor","Brown","Williams","Wilson","Johnson","Davies","Patel","Wright"];

    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];

    return { first, last, full: `${first} ${last}` };
  }

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const contact = generateUKContactName();

  const payload = {
    contact_num: '00000000000',
    custom: {
      firstname: contact.first,
      lastname: contact.last,
      contact_name: contact.full,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      contact_phone: `07${Math.floor(100000000 + Math.random() * 900000000)}`,
      contact_email: `contact${unique()}@mailinator.com`,
      contact_address: '10 Baker Street',
      contact_city: 'London',
      contact_post_code: 'AB12 3CD',
      contact_country: 1,
      createtime: now(),
      modifiedtime: now(),
    },
    source: 'web',
    status: '1',
  };

  const createRes = await contactApi.createContact(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.contactid).toBeDefined();
  expect.soft(createRes.contact_name).toBe(contact.full);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await contactApi.getContact();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.contactid).toBe(createRes.contactid);
  expect.soft(getRes.contact_email).toBe(payload.custom.contact_email);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await contactApi.searchContacts(
    `contact_email=${payload.custom.contact_email}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.contactid === createRes.contactid
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  const updatedContact = generateUKContactName();
  payload.custom.contact_name = updatedContact.full; // ✅ no number
  payload.custom.firstname = updatedContact.first;
  payload.custom.lastname = updatedContact.last;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await contactApi.updateContact(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await contactApi.searchContacts(`contact_email=${payload.custom.contact_email}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.contactid === createRes.contactid && item.contact_name === payload.custom.contact_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyContact = generateUKContactName();
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      contact_name: `${dummyContact.full} ${unique()}`,
      firstname: dummyContact.first,
      lastname: dummyContact.last,
      contact_email: `contact${unique()}@mailinator.com`
    }
  };

  const dummyRes = await contactApi.createContact(dummyPayload);
  const deleteId = dummyRes.contactid;

  const startDelete = Date.now();

  const deleteRes = await contactApi.deleteContactById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await contactApi.getContactById(deleteId);

  expect.soft(deletedCheck?.contactid).toBeUndefined();
});
