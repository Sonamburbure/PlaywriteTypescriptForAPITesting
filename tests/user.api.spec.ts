import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Event', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  const today = formatDate(now); // ✅ current date for event name

  const payload = {
    event_num: '00000000000',
    custom: {
      event_name: `Event_${today}`,   // ✅ FIXED FORMAT

      event_nature: '446',
      event_type: '448',
      event_status: '451',
      related_customer: 357,
      no_of_bar_required: 2,
      related_venue: 2,
      ownerid: 18,
      no_of_guest: 200,
      event_pricing_mode: '646',
      information: 'API Automation',

      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      event_start_date: today,
      event_end_date: formatDate(new Date(now.getTime() + 86400000)),

      daily_start_time: '09:00',
      daily_end_time: '10:00',
      staff_start_time: '08:00',
      staff_end_time: '11:00',

      setup_datetime: formatDateTime(new Date(now.getTime() - 86400000)),
      cleanup_datetime: formatDateTime(new Date(now.getTime() + 172800000)),

      gross_sales_amount: '5000.00',
      total_sales: '100.00',
      Commission: '200.00',

      budgeted_cogs: '10.00',
      budgeted_payrol: '1.00',
      budgeted_opex: '10.00',
      budgeted_others: '10.00',

      net_profit: '10.00',
      total_invoiced: '10.00',
      total_paid: '10.00',

      event_taskmaster: '640',
      event_equipment_planing_type: '648',
      event_product_planing_type: '651',
      event_execution_type: '827',

      assign_to: 'Sonam Burbure'
    },
    source: 'web',
    status: '1',
  };

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/event`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-automate-secret': process.env.AUTOMATE_SECRET!
      },
      data: payload
    }
  );

  const responseBody = await response.json();

  if (!response.ok()) {
    throw new Error(`❌ Event API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Event Response:', responseBody);

  expect(responseBody).toBeTruthy();

});