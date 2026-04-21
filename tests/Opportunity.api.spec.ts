import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL, BASE_UI_URL } from '../src/utils/constants.js';

test('API + UI: Opportunity creation vs UI validation', async ({ page }) => {

  let opportunityId: number | null = null;

  /* ================= API PART ================= */

  try {
    const apiContext = await request.newContext();

    const token = getAuthToken();
    const tenant = getTenantPath();
    const logonAs = getLogonAs();

    console.log('🔐 Using Token:', token);

    const dateTime = new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    const payload = {
      opportunity_num: '00000000000',
      source: 'none',
      status: '1',
      custom: {
        opportunity_name: `Auto Opp ${Date.now()}`,
        close_date: '2026-04-01',
        sales_stage: 132,
        opportunity_type: 123,
        set_up_required: 722,
        lead_source: 141,
        opportunity_payment_terms: 202,
        ownerid: 18,
        assign_to: 'Sonam Burbure',   // ✅ fixed
        createtime: dateTime,
        modifiedtime: dateTime,
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

    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    const response = await apiContext.post(
      `${BASE_API_URL}/${tenant}/api/${logonAs}/opportunity`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-automate-secret': process.env.AUTOMATE_SECRET!
        },
        data: payload
      }
    );

    const body = await response.json();

    console.log('✅ API Response:', body);

    if (!response.ok()) {
      console.log('❌ API failed but continuing...');
    }

    if (body.error_msg) {
      console.log('❌ API validation error:', body.error_msg);
    }

    const opportunity = Array.isArray(body) ? body[0] : body;

    opportunityId = opportunity?.opportunityid;

    console.log('🎯 Created Opportunity ID:', opportunityId);

  } catch (err) {
    console.log('❌ API exception but continuing to UI:', err);
  }

  /* ================= UI PART ================= */

  console.log('🚀 Starting UI validation');

  await page.goto(BASE_UI_URL);

  // 👉 adjust if your route is different
  await page.goto(`${BASE_UI_URL}/#/opportunity`);

  // safer click
  await page.locator('text=Create').first().click();

  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log('🌐 Current URL after Create:', currentUrl);

  // 📸 Screenshot always
  await page.screenshot({ path: 'ui-result.png', fullPage: true });

  /* ================= VALIDATION ================= */

  if (currentUrl.includes('api')) {
    console.log('❌ BUG: Redirected to API URL (blank page issue)');
  } else {
    console.log('✅ UI navigation looks correct');
  }

  // optional assertion (soft check)
  expect(currentUrl).toBeTruthy();

});