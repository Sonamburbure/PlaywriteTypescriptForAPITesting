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
      related_supplierorder: 337,
      supplierorderreceiptwarehouse_multiple_record: 'Saturday',
      supplierorderreceiptwarehouse_multiple_module: 'warehouse',
      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: 'Sonam Burbure' // ⚠️ if error → use 18
    },
    lines: {
      linegroup: {}
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