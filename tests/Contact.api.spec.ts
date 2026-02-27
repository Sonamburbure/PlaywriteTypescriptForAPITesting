import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../src/utils/tokenStore.js';
import { LOGON_AS, BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- UK CONTACT DATA ---------------- */

const UK_CONTACT_TITLES = [
  'Manager',
  'Sales Executive',
  'Accountant',
  'Event Coordinator',
  'Logistics Specialist',
  'Marketing Lead',
  'Customer Service Rep',
  'Operations Manager',
  'Business Analyst',
  'HR Specialist',
];

const UK_CITIES = [
  'London',
  'Manchester',
  'Bristol',
  'Leeds',
  'Birmingham',
  'Oxford',
  'Cambridge',
  'Nottingham',
  'Brighton',
  'York',
];

const UK_STREETS = [
  "Baker Street",
  "King's Road",
  "High Street",
  "Church Lane",
  "Queens Avenue",
  "Park Road",
  "Victoria Street",
  "Station Road",
  "Mill Lane",
  "Station Approach",
];

/* ---------------- UTILS ---------------- */

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function generateContactName() {
  const firstName = UK_FIRST_NAMES[Math.floor(Math.random() * UK_FIRST_NAMES.length)];
  const lastName = UK_LAST_NAMES[Math.floor(Math.random() * UK_LAST_NAMES.length)];
  
  return {
    firstName: `${firstName}`,
    lastName,
  };
}

function getRandomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---------------- UK FIRST & LAST NAMES ---------------- */

const UK_FIRST_NAMES = [
  'James', 'Oliver', 'Harry', 'George', 'Noah',
  'Jack', 'Leo', 'Charlie', 'Jacob', 'Alfie',
  'Emily', 'Amelia', 'Olivia', 'Isla', 'Ava',
  'Sophia', 'Mia', 'Charlotte', 'Ella', 'Grace'
];

const UK_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor',
  'Wilson', 'Davies', 'Evans', 'Thomas', 'Roberts',
  'Walker', 'Wright', 'Thompson', 'White', 'Hughes'
];

/* ---------------- AUTH API ---------------- */

class AuthApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async fetchTenantOptions() {
    await this.init();
    const response = await this.apiContext!.get(
      `${BASE_API_URL}/api/tenant-options`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body.data || [];
  }

  async login(email: string, password: string, tenantName: string) {
    await this.init();
    const response = await this.apiContext!.post(
      `${BASE_API_URL}/api/login`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { email, password, tenant_name: tenantName },
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body.token).toBeTruthy();
    expect(body.tenant_cname).toBeTruthy();
    expect(body.logon_as).toBeTruthy();

    return body;
  }
}

/* ---------------- CONTACT API ---------------- */

class ContactApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createContact(payload: any) {
    await this.init();

    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    expect(token).toBeTruthy();
    expect(tenantPath).toBeTruthy();
    expect(logonAs).toBeTruthy();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/contact`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      }
    );

    expect(response.ok()).toBeTruthy();
    return await response.json();
  }
}

/* ---------------- TEST ---------------- */

test('API only: login and create Contact', async () => {
  const authApi = new AuthApi();

  // 1️⃣ Fetch tenant (Dream Events fix applied)
  const tenants = await authApi.fetchTenantOptions();

  const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, '');

  const tenant = tenants.find(
    (t: any) => normalize(t.optionlabel) === normalize('Dream Events')
  );

  if (!tenant) {
    throw new Error('Tenant "Dream Events" not found');
  }

  // 2️⃣ Login
  const loginResponse = await authApi.login(
    EMAIL,
    PASSWORD,
    tenant.optionvalue
  );

  setAuthToken(loginResponse.token);
  setTenantPath(loginResponse.tenant_cname);
  setLogonAs(loginResponse.logon_as);

  expect(getAuthToken()).toBeTruthy();
  expect(getTenantPath()).toBeTruthy();

  // 3️⃣ Generate meaningful UK contact name
  const { firstName, lastName } = generateContactName();
  const dateTime = getCurrentDateTime();

  // 4️⃣ Payload (full fields with meaningful UK data)
  const payload = {
    contact_num: '00000000000',
    custom: {
      contact_salutation: '119',
      firstname: firstName,
      lastname: lastName,
      contactrelatedto_multiple_record: '9', // example related customer id
      contactrelatedto_multiple_module: '1',
      contact_title: getRandomFromArray(UK_CONTACT_TITLES),
      ownerid: 6,
      contact_phone: `0${Math.floor(7000000000 + Math.random() * 2999999999)}`,  // realistic UK mobile number
      contact_mobile: `0${Math.floor(7000000000 + Math.random() * 2999999999)}`, // realistic UK mobile number
      contact_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.com`,
      contact_email2: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.com`,
      createtime: dateTime,
      modifiedtime: dateTime,
      contact_address: `${Math.floor(Math.random() * 100) + 1} ${getRandomFromArray(UK_STREETS)}`,
      contact_city: getRandomFromArray(UK_CITIES),
      contact_post_code: 'AB12 3CD',
      contact_county: 5,
      contact_country: 1,
      assign_to: 'Sonam Burbure',
      contact_name: `${firstName} ${lastName}`,
    },
    source: 'web',
    status: '1',
  };

  console.log('Final Contact Payload:', JSON.stringify(payload, null, 2));

  // 5️⃣ Create contact
  const contactApi = new ContactApi();
  const response = await contactApi.createContact(payload);

  console.log('Create Contact API response:', response);

  // 6️⃣ Assertions
  const contact = Array.isArray(response) ? response[0] : response;

  expect(contact, '❌ Contact response is empty').toBeTruthy();
  expect(contact.contactid, '❌ contactid missing in response').toBeTruthy();
  expect(typeof contact.contactid, '❌ contactid is not a number').toBe('number');

  // Optional deep validation
  expect(contact.firstname ?? contact.custom?.firstname).toContain(firstName.split('_')[0]);

  console.log('✅ Created Contact ID:', contact.contactid);
});
