import { test, expect, request } from '@playwright/test';
import {
  getAuthToken,
  getTenantPath,
  getLogonAs
} from '../src/utils/tokenStore.js';

import { BASE_API_URL } from '../src/utils/constants.js';

/* -------- PROFESSIONAL TOPICS -------- */

const TOPIC_NAMES = [
  'Health & Safety Guidelines',
  'Customer Service Excellence',
  'Workplace Compliance Standards',
  'Operational Best Practices',
  'Food & Beverage Handling',
  'Event Setup Procedures',
  'Inventory Management Basics',
  'Staff Coordination Process',
  'Quality Assurance Standards',
  'Emergency Response Procedures'
];

const TOPIC_DETAILS = [
  'Covers standard procedures and compliance requirements to ensure safe and efficient operations.',
  'Provides best practices and guidelines to improve customer satisfaction and service delivery.',
  'Includes step-by-step instructions for maintaining operational standards and compliance.',
  'Focuses on improving efficiency, coordination, and workplace safety protocols.',
  'Describes processes for handling tasks effectively while maintaining quality standards.'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateTime(d: Date) {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

test('API only: Create Training Topic', async () => {

  const apiContext = await request.newContext();

  const token = getAuthToken();
  const tenant = getTenantPath();
  const logonAs = getLogonAs();

  console.log('🔐 Using Token:', token);

  const now = new Date();

  const topicName = `${getRandom(TOPIC_NAMES)}_${Date.now()}`;
  const topicDetails = getRandom(TOPIC_DETAILS);

  const payload = {
    trainingtopic_num: "00000000000",
    custom: {
      trainingtopic_name: topicName,
      related_training: 5,

      trainingtopic_content_type: "829",
      trainingtopic_content_details: topicDetails,
      trainingtopic_file_type: 806,

      ownerid: 18,
      createtime: formatDateTime(now),
      modifiedtime: formatDateTime(now),

      assign_to: "Sonam Burbure" // ⚠️ if error → use 18
    },
    source: "web",
    status: "1"
  };

  console.log('📤 Payload:', JSON.stringify(payload, null, 2));

  const response = await apiContext.post(
    `${BASE_API_URL}/${tenant}/api/${logonAs}/trainingtopic`,
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
    throw new Error(`❌ Training Topic API failed: ${JSON.stringify(responseBody)}`);
  }

  console.log('✅ Create Training Topic Response:', responseBody);

  expect(responseBody).toBeTruthy();

});