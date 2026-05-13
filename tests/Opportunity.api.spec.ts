import { test, expect } from '@playwright/test';
import { OpportunityApi } from '../src/api/OpportunityApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const opportunityApi = new OpportunityApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const oppName = `Auto Opp ${unique()}`; // ✅ avoid duplicate

  const payload = {
    opportunity_num: '00000000000',
    source: 'none',
    status: '1',
    custom: {
      opportunity_name: oppName,
      close_date: '2026-04-01',
      sales_stage: 132,
      opportunity_type: 123,
      set_up_required: 722,
      lead_source: 141,
      opportunity_payment_terms: 202,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
      opportunity_country: 1,
      copy_costs: 1,
      expected_sales: '0',
      expected_profit: '0',
      operational_expenses: '0',
      payroll_costs: '0',
      net_profit: '0',
      rate_conversion: '1.00',
      other_costs: '0'
    },
    recurring: null,
    lines: { linegroup: {} },
    createevent: false
  };

  const createRes = await opportunityApi.createOpportunity(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.opportunityid).toBeDefined();
  expect.soft(createRes.opportunity_name).toBe(payload.custom.opportunity_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await opportunityApi.getOpportunity();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.opportunityid).toBe(createRes.opportunityid);
  expect.soft(getRes.opportunity_name).toBe(payload.custom.opportunity_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await opportunityApi.searchOpportunities(
    `opportunity_name=${payload.custom.opportunity_name}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.opportunity_name === payload.custom.opportunity_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.opportunity_name = `Auto Opp ${unique()}`; // ✅ unique updated name
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await opportunityApi.updateOpportunity(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await opportunityApi.searchOpportunities(`opportunity_name=${payload.custom.opportunity_name}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) => item.opportunity_name === payload.custom.opportunity_name);
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      opportunity_name: `Auto Opp ${unique()}`
    }
  };

  const dummyRes = await opportunityApi.createOpportunity(dummyPayload);
  const deleteId = dummyRes.opportunityid;

  const startDelete = Date.now();

  const deleteRes = await opportunityApi.deleteOpportunityById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await opportunityApi.getOpportunityById(deleteId);

  expect.soft(deletedCheck?.opportunityid).toBeUndefined();
});
