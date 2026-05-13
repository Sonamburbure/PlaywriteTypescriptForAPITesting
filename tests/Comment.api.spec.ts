import { test, expect } from '@playwright/test';
import { CommentsApi } from '../src/api/commentsApi.js';

test('API: POST → GET → SEARCH → PUT → SEARCH → DELETE (with response time)', async ({ request }) => {

  const commentsApi = new CommentsApi(request);

  const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
  const unique = () => Date.now();

  // =======================
  // ✅ CREATE
  // =======================
  const startPost = Date.now();

  const commentText = `Test comment ${unique()}`; // ✅ avoid duplicate

  const payload = {
    comment_num: '00000000000',
    custom: {
      comment: commentText,
      module_comment: 'hello',
      ownerid: 18,
      assign_to: 'Sonam Burbure',
      createtime: now(),
      modifiedtime: now(),
    },
    source: 'web',
    status: '1',
  };

  const createRes = await commentsApi.createComment(payload);

  const postTime = Date.now() - startPost;
  console.log(`⏱️ POST Response Time: ${postTime} ms`);

  expect.soft(postTime).toBeLessThan(2000);
  expect.soft(createRes.commentid).toBeDefined();
  expect.soft(createRes.comment).toBe(payload.custom.comment);

  // =======================
  // ✅ GET
  // =======================
  const startGet = Date.now();

  const getRes = await commentsApi.getComment();

  const getTime = Date.now() - startGet;
  console.log(`⏱️ GET Response Time: ${getTime} ms`);

  expect.soft(getTime).toBeLessThan(2000);
  expect.soft(getRes.commentid).toBe(createRes.commentid);
  expect.soft(getRes.comment).toBe(payload.custom.comment);

  // =======================
  // 🔍 SEARCH
  // =======================
  const searchRes = await commentsApi.searchComments(
    `comment=${payload.custom.comment}`
  );

  console.log("🔍 SEARCH Response:", searchRes);

  const data = searchRes?.data || [];

  expect.soft(data.length).toBeGreaterThan(0);

  const found = data.some((item: any) =>
    item.comment === payload.custom.comment
  );

  expect.soft(found).toBeTruthy();

  // =======================
  // ✅ PUT
  // =======================
  payload.custom.comment = `Updated comment ${unique()}`; // ✅ unique updated text
  payload.custom.modifiedtime = now();

  const startPut = Date.now();

  await commentsApi.updateComment(payload);

  const putTime = Date.now() - startPut;
  console.log(`⏱️ PUT Response Time: ${putTime} ms`);

  expect.soft(putTime).toBeLessThan(2000);

  const searchAfterPut = await commentsApi.searchComments(`comment=${payload.custom.comment}`);
  const dataAfterPut = searchAfterPut?.data || [];
  const commentUpdated = dataAfterPut.some((item: any) => item.comment === payload.custom.comment);
  expect.soft(commentUpdated).toBeTruthy();

  // =======================
  // 🗑️ DELETE (dummy)
  // =======================
  const dummyPayload = {
    ...payload,
    custom: {
      ...payload.custom,
      comment: `Dummy comment ${unique()}`
    }
  };

  const dummyRes = await commentsApi.createComment(dummyPayload);
  const deleteId = dummyRes.commentid;

  const startDelete = Date.now();

  const deleteRes = await commentsApi.deleteCommentById(deleteId);

  const deleteTime = Date.now() - startDelete;
  console.log(`⏱️ DELETE Response Time: ${deleteTime} ms`);

  expect.soft(deleteTime).toBeLessThan(4000);
  expect.soft(deleteRes?.success).toBe(true);

  // =======================
  // 🔥 VERIFY DELETE
  // =======================
  const deletedCheck = await commentsApi.getCommentById(deleteId);

  expect.soft(deletedCheck?.commentid).toBeUndefined();
});
