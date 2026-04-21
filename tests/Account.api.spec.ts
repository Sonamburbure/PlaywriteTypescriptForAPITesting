import { test, expect } from '@playwright/test';
import { AccountApi } from '../src/api/AccountApi.js';

// ✅ UK Name Generator
function generateUKCustomerName(): string {
  const firstNames = [
    "Oliver", "George", "Harry", "Jack", "Noah",
    "Olivia", "Amelia", "Isla", "Ava", "Emily"
  ];

  const lastNames = [
    "Smith", "Jones", "Taylor", "Brown", "Williams",
    "Wilson", "Johnson", "Davies", "Patel", "Wright"
  ];

  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${first} ${last}`;
}

// ✅ Logical UK Email Generator (no "updated")
function generateUKEmail(name: string): string {
  const domains = ["gmail.com", "outlook.com", "yahoo.co.uk"];

  const cleanName = name.toLowerCase().replace(" ", ".");
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const domain = domains[Math.floor(Math.random() * domains.length)];

  return `${cleanName}${unique}@${domain}`;
}

// ✅ Logical UK Address Generator
function generateUKAddress() {
  const streets = [
    "Baker Street", "Oxford Street", "King's Road",
    "High Street", "Victoria Road", "Church Lane"
  ];

  const cities = [
    "London", "Manchester", "Birmingham",
    "Leeds", "Liverpool", "Bristol"
  ];

  const postCodes = [
    "EC1A 1BB", "W1A 0AX", "M1 1AE",
    "B1 1AA", "LS1 1UR", "L1 8JQ"
  ];

  return {
    address: `${Math.floor(Math.random() * 200) + 1}, ${streets[Math.floor(Math.random() * streets.length)]}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    postCode: postCodes[Math.floor(Math.random() * postCodes.length)]
  };
}

test('API: Create → Get → Update Account with Logical Data', async ({ request }) => {

  const accountApi = new AccountApi(request);

  // =======================
  // ✅ POST (Create)
  // =======================
  const customerName = generateUKCustomerName();
  const email = generateUKEmail(customerName);
  const address = generateUKAddress();

  const createPayload = {
    customer_num: '00000000000',
    custom: {
      customer_name: customerName,
      customer_phone: '07123456789',
      customer_email: email,
      assign_to: 'Sonam Burbure',
      ownerid: 18,
      createtime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      modifiedtime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      customer_address: address.address,
      customer_city: address.city,
      customer_post_code: address.postCode,
      customer_county: 5,
      customer_country: 1,
    },
    source: 'web',
    status: '1',
  };

  const createRes = await accountApi.createAccount(createPayload);

  console.log("📩 POST Response:", createRes);

  expect(createRes.customerid).toBeDefined();
  expect(createRes.customer_name).toContain(customerName.split(' ')[0]);

  // =======================
  // ✅ GET
  // =======================
  const getRes = await accountApi.getAccount();

  console.log("📩 GET Response:", getRes);

  expect(getRes.customer_name).toContain(customerName.split(' ')[0]);

  // =======================
  // ✅ PUT (Update)
  // =======================
  const updatedName = generateUKCustomerName();
  const updatedEmail = generateUKEmail(updatedName);
  const updatedAddress = generateUKAddress();

  const updatePayload = {
    customer_num: createRes.customer_num,
    custom: {
      customer_name: updatedName,
      customer_phone: '07987654321',
      customer_email: updatedEmail,
      assign_to: 'Sonam Burbure',
      ownerid: 18,
      createtime: createRes.createtime,
      modifiedtime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      customer_address: updatedAddress.address,
      customer_city: updatedAddress.city,
      customer_post_code: updatedAddress.postCode,
      customer_county: 5,
      customer_country: 1,
    },
    source: 'web',
    status: '1',
  };

  console.log("🚀 PUT Payload:", updatePayload);

  const putRes = await accountApi.updateAccount(updatePayload);

  console.log("📩 PUT Response:", putRes);

  if (putRes.error_msg || putRes.error) {
    throw new Error(`❌ PUT Failed: ${JSON.stringify(putRes)}`);
  }

  expect(putRes.customer_name).toContain(updatedName.split(' ')[0]);

  // =======================
  // ✅ GET again (Verify update)
  // =======================
  const getUpdatedRes = await accountApi.getAccount();

  console.log("📩 GET Updated Response:", getUpdatedRes);

  expect(getUpdatedRes.customer_name)
    .toContain(updatedName.split(' ')[0]);

});