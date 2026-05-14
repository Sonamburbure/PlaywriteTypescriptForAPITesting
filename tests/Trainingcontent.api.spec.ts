import { test, expect } from '@playwright/test';
import { TrainingContentApi } from '../src/api/TrainingcontentApi.js';

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

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const trainingContentApi = new TrainingContentApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const topicName = `${getRandom(TOPIC_NAMES)}_${unique()}`;

  const payload = {
    trainingtopic_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      trainingtopic_name: topicName,
      related_training: 5,
      trainingtopic_content_type: '829',
      trainingtopic_content_details: getRandom(TOPIC_DETAILS),
      trainingtopic_file_type: 806,
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await trainingContentApi.createTrainingContent(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.trainingtopicid).toBeDefined();
  expect.soft(createRes.trainingtopic_name).toBe(payload.custom.trainingtopic_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await trainingContentApi.getTrainingContent();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.trainingtopicid).toBe(createRes.trainingtopicid);
  expect.soft(getRes.trainingtopic_name).toBe(payload.custom.trainingtopic_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await trainingContentApi.searchTrainingContents(
    `trainingtopic_name=${payload.custom.trainingtopic_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.trainingtopic_name === payload.custom.trainingtopic_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.trainingtopic_name = `${getRandom(TOPIC_NAMES)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await trainingContentApi.updateTrainingContent(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await trainingContentApi.searchTrainingContents(
    `trainingtopic_name=${payload.custom.trainingtopic_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.trainingtopic_name === payload.custom.trainingtopic_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      trainingtopic_name: `${getRandom(TOPIC_NAMES)}_${unique()}`,
    }
  };

  const dummyRes = await trainingContentApi.createTrainingContent(dummyPayload);
  const deleteId = dummyRes.trainingtopicid;

  const startDelete = Date.now();

  const deleteRes = await trainingContentApi.deleteTrainingContentById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await trainingContentApi.getTrainingContentById(deleteId);

  expect.soft(deletedCheck?.trainingtopicid).toBeUndefined();
});
