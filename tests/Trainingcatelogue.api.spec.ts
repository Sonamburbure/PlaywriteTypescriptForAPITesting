import { test, expect } from '@playwright/test';
import { TrainingCatalogueApi } from '../src/api/TrainingcatelogueApi.js';

const UK_FIRST_NAMES = [
  'James', 'Oliver', 'George', 'Harry', 'Noah',
  'Emily', 'Amelia', 'Olivia', 'Isla', 'Ava'
];

const UK_LAST_NAMES = [
  'Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson',
  'Davies', 'Evans', 'Thomas', 'Roberts', 'Walker'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrainerName() {
  return `${getRandom(UK_FIRST_NAMES)} ${getRandom(UK_LAST_NAMES)}`;
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const trainingApi = new TrainingCatalogueApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const trainingName = `${generateTrainerName()} Training_${unique()}`;

  const payload = {
    training_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      training_name: trainingName,
      training_category: 795,
      training_url: 'url',
      training_valid_for: '3.00',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await trainingApi.createTrainingCatalogue(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(3000);
  expect.soft(createRes.trainingid).toBeDefined();
  expect.soft(createRes.training_name).toBe(payload.custom.training_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await trainingApi.getTrainingCatalogue();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(3000);
  expect.soft(getRes.trainingid).toBe(createRes.trainingid);
  expect.soft(getRes.training_name).toBe(payload.custom.training_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await trainingApi.searchTrainingCatalogues(
    `training_name=${payload.custom.training_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.training_name === payload.custom.training_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.training_name = `${generateTrainerName()} Training_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await trainingApi.updateTrainingCatalogue(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(3000);

  const searchAfterPut = await trainingApi.searchTrainingCatalogues(
    `training_name=${payload.custom.training_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.training_name === payload.custom.training_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      training_name: `${generateTrainerName()} Training_${unique()}`,
    }
  };

  const dummyRes = await trainingApi.createTrainingCatalogue(dummyPayload);
  const deleteId = dummyRes.trainingid;

  const startDelete = Date.now();

  const deleteRes = await trainingApi.deleteTrainingCatalogueById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await trainingApi.getTrainingCatalogueById(deleteId);

  expect.soft(deletedCheck?.trainingid).toBeUndefined();
});
