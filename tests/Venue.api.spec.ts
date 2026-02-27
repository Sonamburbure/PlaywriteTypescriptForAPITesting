import { test, expect, request, APIRequestContext } from '@playwright/test';
import {
  setAuthToken,
  setTenantPath,
  setLogonAs,
  getAuthToken,
  getTenantPath,
  getLogonAs,
} from '../src/utils/tokenStore.js';
import { BASE_API_URL, EMAIL, PASSWORD } from '../src/utils/constants.js';

/* ---------------- UK PLACE DATA ---------------- */

const UK_PLACES = [
  'London', 'Manchester', 'A', 'Leeds', 'Liverpool',
  'Bristol', 'Nottingham', 'Sheffield', 'Leicester', 'Coventry',
  'Oxford', 'Cambridge', 'York', 'Bath', 'Reading',
  'Milton Keynes', 'Luton', 'Watford', 'Slough', 'Woking'
];

/* ---------------- UTILS ---------------- */

function getCurrentDateTime() {
  return new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

function generateUKVenueName() {
  const place = UK_PLACES[Math.floor(Math.random() * UK_PLACES.length)];
  const date = getCurrentDateTime().split(' ')[0];
  return `${place} Venue ${date}`;
}

/* ---------------- AUTH API ---------------- */

export class AuthApi {
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

/* ---------------- VENUE API ---------------- */

export class VenueApi {
  private apiContext?: APIRequestContext;

  async init() {
    if (!this.apiContext) {
      this.apiContext = await request.newContext();
    }
  }

  async createVenue(payload: any) {
    await this.init();

    const token = getAuthToken();
    const tenantPath = getTenantPath();
    const logonAs = getLogonAs();

    expect(token).toBeTruthy();
    expect(tenantPath).toBeTruthy();
    expect(logonAs).toBeTruthy();

    const response = await this.apiContext!.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/venue`,
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

test('API only: login and create Venue with UK place name', async () => {
  const authApi = new AuthApi();

  // 1️⃣ Fetch tenant list (Dream Events fix applied)
  const tenants = await authApi.fetchTenantOptions();

  const tenant = tenants.find(
    (t: any) => normalize(t.optionlabel) === normalize('Dream Events')
  );

  if (!tenant) {
    throw new Error(
      `Tenant "Dream Events" not found. Available: ${tenants
        .map((t: any) => t.optionlabel)
        .join(', ')}`
    );
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

  // 3️⃣ Prepare payload
  const currentDateTime = getCurrentDateTime();
  const venueName = generateUKVenueName();

  const payload = {
    venue_num: '00000000000',
    custom: {
      venue_name: venueName,
      venue_phone: '1234456789',
      venue_email: 'abc@gmail.com',
      createtime: currentDateTime,
      modifiedtime: currentDateTime,
      ownerid: 6,
      venue_address: 'New Street',
      venue_city: 'NewTown',
      venue_post_code: '123456',
      venue_county: 5,
      venue_country: 1,
      assign_to: 'Sonam Burbure',
    },
    source: 'web',
    status: '1',
  };

  console.log('Final Venue Payload:', JSON.stringify(payload, null, 2));

  // 4️⃣ Create venue
  const venueApi = new VenueApi();
  const response = await venueApi.createVenue(payload);

  console.log('Create venue API response:', response);

  // 5️⃣ Assertions
  const venue = Array.isArray(response) ? response[0] : response;

  expect(venue).toBeTruthy();
  expect(venue.venueid).toBeTruthy();
  expect(typeof venue.venueid).toBe('number');

  console.log('Created Venue ID:', venue.venueid);
});
