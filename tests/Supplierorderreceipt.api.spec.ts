import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

test('API only: Create Supplier Order Receipt', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const formatDateTime = (d: Date) =>
    d.toISOString().replace('T', ' ').substring(0, 19);

  const payload = {
    supplierorderreceipt_num: '00000000000',
    source: 'none',
    status: '1',
    custom: {
      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: 'Sonam Burbure' // ⚠️ if 400 error → change to 18
    },
    lines: {
      linegroup: {
        nogrp: [
          {
            product_id: '3',
            supplierorderreceipt_product: 'MilkShake/1 liter bottle',
            product_module: '',
            warehouse_multiple_record: '',
            warehouse_multiple_module: '',
            ordered_qty: '400.00',
            pending_qty: 399,
            qty_received: 1,
            batch_or_serial: '',
            batch_expiry: '',
            tuom_quantity: '',
            tuom_unit: '',
            item_start_datetime: '',
            item_end_datetime: '',
            _freeze: true,
            line_order: 1
          }
        ]
      }
    },
    createevent: false
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/supplierorderreceipt`,
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
    throw new Error(`❌ Supplier Order Receipt API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Supplier Order Receipt Response:', responseBody);

  expect(responseBody).toBeTruthy();

});