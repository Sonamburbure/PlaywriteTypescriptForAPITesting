import { test, expect } from '@playwright/test';
import { EmployeeTrainingApi } from '../src/api/EmployeeTrainningApi.js';

const TRAINING_NAMES = [
  'Corporate Excellence Training',
  'Leadership Development Program',
  'Advanced Customer Service Training',
  'Workplace Compliance Training',
  'Health & Safety Certification',
  'Operational Efficiency Workshop',
  'Team Management Training',
  'Business Communication Skills',
  'Professional Development Program',
  'Sales Performance Enhancement'
];

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const employeeTrainingApi = new EmployeeTrainingApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  const uniqueDateSet = () => {
    const base = new Date(Date.now() + Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
    const validUpto = new Date(base.getTime() + 6 * 24 * 60 * 60 * 1000);
    return {
      trainingDate: base.toISOString().split('T')[0],
      validUpto: validUpto.toISOString().split('T')[0],
      acceptedOn: validUpto.toISOString().split('T')[0],
    };
  };

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const trainingName = `${getRandom(TRAINING_NAMES)}_${unique()}`;
  const d = uniqueDateSet();

  const payload = {
    employeetraining_num: '00000000000',
    source: 'web',
    status: '1',
    custom: {
      employeetraining_name: trainingName,
      related_employee: 11,
      related_training: 4,
      employeetraining_date: d.trainingDate,
      employeetraining_valid_upto: d.validUpto,
      employeetraining_status: '798',
      employeetraining_accepted_on: d.acceptedOn,
      employeetraining_trainer_name: 'Emma',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    }
  };

  const createRes = await employeeTrainingApi.createEmployeeTraining(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.employeetrainingid).toBeDefined();
  expect.soft(createRes.employeetraining_name).toBe(payload.custom.employeetraining_name);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await employeeTrainingApi.getEmployeeTraining();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.employeetrainingid).toBe(createRes.employeetrainingid);
  expect.soft(getRes.employeetraining_name).toBe(payload.custom.employeetraining_name);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await employeeTrainingApi.searchEmployeeTrainings(
    `employeetraining_name=${payload.custom.employeetraining_name}`
  );

  console.log('🔍 SEARCH Response:', searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.employeetraining_name === payload.custom.employeetraining_name
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.employeetraining_name = `${getRandom(TRAINING_NAMES)}_${unique()}`;
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await employeeTrainingApi.updateEmployeeTraining(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await employeeTrainingApi.searchEmployeeTrainings(
    `employeetraining_name=${payload.custom.employeetraining_name}`
  );
  const dataAfterPut = searchAfterPut?.data || [];
  const nameUpdated = dataAfterPut.some((item: any) =>
    item.employeetraining_name === payload.custom.employeetraining_name
  );
  expect.soft(nameUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyDates = uniqueDateSet();
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      employeetraining_name: `${getRandom(TRAINING_NAMES)}_${unique()}`,
      employeetraining_date: dummyDates.trainingDate,
      employeetraining_valid_upto: dummyDates.validUpto,
      employeetraining_accepted_on: dummyDates.acceptedOn,
    }
  };

  const dummyRes = await employeeTrainingApi.createEmployeeTraining(dummyPayload);
  const deleteId = dummyRes.employeetrainingid;

  const startDelete = Date.now();

  const deleteRes = await employeeTrainingApi.deleteEmployeeTrainingById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await employeeTrainingApi.getEmployeeTrainingById(deleteId);

  expect.soft(deletedCheck?.employeetrainingid).toBeUndefined();
});
