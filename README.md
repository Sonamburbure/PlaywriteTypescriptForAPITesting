# AutomateEvents — Test Automation Framework

**Author:** Sonam Burbure  
**Date:** May 2026

---

## Overview

This is a test automation framework I built for the AutomateEvents platform using Playwright and TypeScript. It covers both API testing and UI testing so we can catch bugs early before they reach production.

The framework supports three environments — dev, stage and prod — and switching between them does not require any code changes.

---

## Technologies Used

- **Playwright** — for both API and browser-based UI testing
- **TypeScript** — strongly typed, easier to maintain
- **tsx** — to run TypeScript files directly
- **dotenv** — to manage environment-specific configuration
-

---

## Folder Structure

```
PlaywrightProject/
├── tests/                         # All test files
│   ├── smoke.api.spec.ts          # Full event flow test (end-to-end)
│   ├── Account.api.spec.ts
│   ├── Barsetup.api.spec.ts
│   ├── ... (65 API test files)
│   └── ui/
│       ├── Account.ui.spec.ts
│       ├── CreateEventPage.ui.spec.ts
│       └── BarcardAndAutoPreplanPage.ui.spec.ts
│
├── src/
│   ├── api/                       # API helper classes — one per module
│   ├── pages/                     # Page Objects for UI tests
│   │   ├── AccountPage.ts
│   │   ├── LoginPage.ts
│   │   ├── CreateEventPage.ts
│   │   └── BarcardAndAutoPreplanPage.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── dataStore.ts
│   │   └── tokenStore.ts
│   └── global-setup.ts            # Runs login before tests start
│
├── playwright.config.ts
├── .env.dev
├── .env.stage
├── .env.prod
└── storageState.json              # Saved browser session (auto-generated)
```

---

## Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Each environment has its own `.env` file. Example format:

```env
EMAIL=user@example.com
PASSWORD=yourpassword
BASE_UI_URL=https://web.automateevents.com

API_EMAIL=api@example.com
API_PASSWORD=api-password
BASE_API_URL=https://prod-api.automateevents.com
TENANT_NAME=your-tenant
AUTOMATE_SECRET=your-secret
```

---

## Running Tests

### Direct commands (no extra flags needed)

The framework is smart enough to detect which environment to use based on the test file name:
- API spec files → automatically uses dev environment
- UI spec files → automatically uses prod environment

```bash
# Run the smoke test
npx playwright test tests/smoke.api.spec.ts

# Run Account UI test
npx playwright test tests/ui/Account.ui.spec.ts
```

### Using npm scripts

```bash
# API tests
npm run api:dev          # all API tests on dev
npm run api:stage        # all API tests on stage
npm run api:prod         # all API tests on prod

# Smoke tests only
npm run smoke:dev
npm run smoke:stage
npm run smoke:prod

# UI tests
npm run ui:prod          # headless
npm run ui:prod:headed   # with visible browser

# View last test report
npm run report
```

---

## Authentication

I set up a global-setup file that runs automatically before any test starts. It handles login for both API and UI tests.

**For API tests:** it calls the `/api/login` endpoint, gets a token, and stores it in memory. All API test classes then use that token for their requests.

**For UI tests:** it launches a headless browser in the background, logs into the web app, and saves the browser session to `storageState.json`. The actual UI tests then reuse this saved session so there is no need to log in again for every test.

---

## API Testing

### Structure

I created a separate API class for every module in `src/api/`. Each class handles the HTTP requests for that module — create, read, update, delete. The test file just calls these methods and checks the responses.

### Test Coverage Pattern

Every API test follows the same pattern:

1. **POST** — create a new record
2. **GET** — fetch it and verify the data
3. **PUT** — update it
4. **Search** — filter by name/field and confirm it appears
5. **DELETE** — delete a dummy record
6. **Verify delete** — confirm the record no longer exists

I also added response time checks — if an endpoint takes more than 2 seconds it logs a warning.

### Modules covered

I wrote API tests for 65+ modules across the platform:

- CRM: Account, Contact, Venue, Supplier, Opportunity, Sales Target
- Bar Setup: BarSetup, BarSetup Products, Equipment, Staffing
- Items Served: ItemServed, Products, Equipment, Staffing
- Menu: Menus, Menu Items, BarCard
- Events: Event, Tasks, Checklist, Expenses, Sales, Employee Files
- Event Planning: Preplanning, Product/Equipment/Staff Planning
- HR: Employee, Documents, Roles, Training, Availability
- Products: Products, Costing, Vendors
- Equipment: Equipment, Costing, Vendors, Bundles
- Staff: StaffTypes, Costing, Vendors, Vendor Prices
- Finance: Step Rates, UOM, UOM Conversion, Segments
- Packages, Notifications, Comments, Import, Subsidiary

---

## Event Flow Test (smoke.api.spec.ts)

This is the most important test in the suite. It covers the complete event setup flow from start to finish — everything that needs to happen in the system before an event can go live.

### Event Flow Steps

```
1.  Create Segments — Product, Equipment and Staff (Segment 1 and Segment 2)
2.  Create UOM (Unit of Measure) for each category
3.  Create Bar Setup
4.  Link Bar Setup → Products, Equipment, Staff
5.  Create Item Served 1 — link Products, Equipment, Staff
6.  Create Item Served 2 — link Products, Equipment, Staff
7.  Create Menu
8.  Add Menu Items (links Items Served to the Menu)
9.  Create Event
10. Create BarCard (links Event + Bar Setup + Menu together)
11. Run AutoPreplan (generates the full staffing and product plan)
```

### Test Data

I avoided using timestamps or random numbers in names. Instead I built a word pool system that picks 3 words from 96 descriptive words — giving over 140,000 unique professional name combinations such as `Prestige Ridge Events` or `Golden Oak Solutions`. This keeps the test data clean and readable.

The test also has retry logic built in for MySQL lock errors, which can occasionally occur during database writes.

---

## UI Testing

### Page Object Model

For UI tests I used the Page Object Model pattern. Each page has its own class in `src/pages/` that holds all the locators and actions. The test file just calls methods like `createAccount()` or `searchAccounts()` — it does not deal with locators directly. This makes tests much easier to maintain when the UI changes.

### UI tests written

**Account Test** (`tests/ui/Account.ui.spec.ts`)
- Opens the Accounts list page
- Clicks Create Account
- Fills in: Account Name, Phone Number, Email, Street Address, Town, Post Code, County (dropdown)
- Saves the form
- Asserts the API returned a success response with a customer ID
- Navigates back to the list
- Uses the search filter to find the created account
- Asserts the correct name, phone, and town appear in the results

**Create Event Test**
- Creates a full event through the UI form
- Asserts the event ID is returned

**Barcard & AutoPreplan Test**
- Creates a bar card
- Triggers AutoPreplan
- Checks the response

### Browser configuration

UI tests run in headed mode by default (browser is visible) so you can see what is happening. Screenshots, videos, and traces are captured automatically on every run and saved in `test-results/`.

---

## Test Reports

After every run, Playwright generates an HTML report:

```bash
npm run report
```

The report shows pass/fail status, duration, screenshots, and you can open the trace viewer to see exactly what happened step by step for any failing test.

Reports are saved in `playwright-report/`  
Screenshots and videos are saved in `test-results/`

---

## Notes

- Tests run sequentially (1 worker) because many tests depend on records created by earlier steps
- SSL certificate errors on dev/stage are handled automatically with `ignoreHTTPSErrors: true`
- The AutoPreplan step can sometimes hit a server-side MySQL limit ("too many placeholders") — this is a known backend limitation and the test handles it gracefully by logging a warning instead of failing
- Duplicate Entry responses from the API are expected in some modules and are not treated as test failures
