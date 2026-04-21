
import { expect, test, request } from '@playwright/test';
import { EventsalesApi } from '../src/api/EventsalesApi.js';

// =========================
// ✅ TEST 1: PAID COMMISSION
// =========================
test('API: Net Sales - Paid Commission', async () => {

  const apiContext = await request.newContext();
  const eventsalesApi = new EventsalesApi(apiContext);

  const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // 👉 Dynamic Gross
  const gross = Math.floor(Math.random() * 50000) + 5000;

  // 👉 Logical Names
  const paidNames = [
    "Premium Bar Sales",
    "VIP Beverage Sales",
    "Cocktail Revenue",
    "Luxury Drink Sales",
    "Event Bar Revenue"
  ];
  const paidName = paidNames[Math.floor(Math.random() * paidNames.length)];

  const payload = {
    eventforecastedsale_num: "00000000000",
    custom: {
      eventforecastedsale_name: paidName,
      related_eventbarcard: 51,
      eventforecastedsale_date: "2026-04-16",
      ownerid: 18,
      eventforecastedsale_category: 822,
      eventforecastedsale_type: 1188,
      eventforecastedsale_gross_sales: gross.toFixed(2),
      eventforecastedsale_fees: "10",
      eventforecastedsale_commision: "0",
      eventforecastedsale_paid_commission: "10",
      eventforecastedsale_vat: "10",
      createtime: currentDateTime,
      modifiedtime: currentDateTime,
      assign_to: "Sonam Burbure"
    },
    source: "web",
    status: "1"
  };

  console.log("🚀 Payload (Paid):", payload);

  const res = await eventsalesApi.createEventsales(payload);

  console.log("📩 Response (Paid):", res);

  if (!Array.isArray(res)) {
    throw new Error(`❌ API failed (Paid): ${JSON.stringify(res)}`);
  }

  const data = res[0];

  // 👉 Calculation
  const afterFees = gross - (gross * 10 / 100);
  const afterCommission = afterFees - (afterFees * 10 / 100);
  const expectedNet = (afterCommission / 1.10).toFixed(2);

  const actualNet = data.eventforecastedsale_net_sales;

  console.log("Gross:", gross);
  console.log("Expected:", expectedNet);
  console.log("Actual:", actualNet);

  expect(actualNet,
    `❌ Paid Commission mismatch\nExpected: ${expectedNet}\nActual: ${actualNet}`
  ).toBe(expectedNet);

});


// =========================
// ✅ TEST 2: RETAINED COMMISSION
// =========================
test('API: Net Sales - Retained Commission', async () => {

  const apiContext = await request.newContext();
  const eventsalesApi = new EventsalesApi(apiContext);

  const currentDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // 👉 Dynamic Gross
  const gross = Math.floor(Math.random() * 50000) + 5000;

  // 👉 Logical Names
  const retainedNames = [
    "Retained Bar Revenue",
    "Commission Based Sales",
    "Event Earnings",
    "Bar Profit Share",
    "Revenue Retention"
  ];
  const retainedName = retainedNames[Math.floor(Math.random() * retainedNames.length)];

  const payload = {
    eventforecastedsale_num: "00000000000",
    custom: {
      eventforecastedsale_name: retainedName,
      related_eventbarcard: 51,
      eventforecastedsale_date: "2026-04-16",
      ownerid: 18,
      eventforecastedsale_category: 822,
      eventforecastedsale_type: 1188,
      eventforecastedsale_gross_sales: gross.toFixed(2),
      eventforecastedsale_fees: "0",
      eventforecastedsale_commision: "10",
      eventforecastedsale_paid_commission: "0",
      eventforecastedsale_vat: "0",
      createtime: currentDateTime,
      modifiedtime: currentDateTime,
      assign_to: "Sonam Burbure"
    },
    source: "web",
    status: "1"
  };

  console.log("🚀 Payload (Retained):", payload);

  const res = await eventsalesApi.createEventsales(payload);

  console.log("📩 Response (Retained):", res);

  if (!Array.isArray(res)) {
    throw new Error(`❌ API failed (Retained): ${JSON.stringify(res)}`);
  }

  const data = res[0];

  // 👉 Calculation
  const expectedNet = (gross * 10 / 100).toFixed(2);

  const actualNet = data.eventforecastedsale_net_sales;

  console.log("Gross:", gross);
  console.log("Expected:", expectedNet);
  console.log("Actual:", actualNet);

  expect(actualNet,
    `❌ Retained Commission mismatch\nExpected: ${expectedNet}\nActual: ${actualNet}`
  ).toBe(expectedNet);

});

