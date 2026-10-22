import { test, expect, Response } from '@playwright/test';
import { CommentPage } from '../../src/pages/CommentPage.js';

// Attach a full-page screenshot to the HTML report whenever a test fails
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
    await testInfo.attach('failure-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    console.log(`Failure screenshot attached — URL at failure: ${page.url()}`);
  }
});

function getRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Logical subjects only — NO digits (guarded by /\d/ + used-list below)
const SUBJECT_TOPICS = ['Feedback', 'Follow-up', 'Reminder', 'Inquiry', 'Update', 'Request', 'Confirmation', 'Note'];
const SUBJECT_MATTERS = ['on catering', 'regarding setup', 'about staffing', 'for the gala', 'on logistics', 'about billing'];

const COMMENT_BODIES = [
  'Catering arrangements confirmed for the event.',
  'Setup schedule shared with the venue team.',
  'Staffing notes updated after the walkthrough.',
  'Billing follow-up logged for the organiser.',
];

function generateCommentSubject(): string {
  return `${getRand(SUBJECT_TOPICS)} ${getRand(SUBJECT_MATTERS)}`;
}

// Generate a logical subject that differs from all subjects already used in this run
function generateNewCommentSubject(used: string[]): string {
  let subject = generateCommentSubject();
  while (used.includes(subject) || /\d/.test(subject)) subject = generateCommentSubject();
  used.push(subject);
  return subject;
}

function generateCommentBody(): string {
  return getRand(COMMENT_BODIES);
}

test('Comment UI Test — Create, Search, Edit, Duplicate, View', async ({ page }, testInfo) => {
  await page.goto(process.env.BASE_UI_URL!);

  const commentPage = new CommentPage(page);

  const usedSubjects: string[] = [];
  const commentData = {
    subject: generateNewCommentSubject(usedSubjects),
    comments: generateCommentBody(),
  };

  // CommentsApi posts to some /comment.../ endpoint — substring '/comment'
  // covers both '/comment/...' and '/comments/...'.
  const isCommentSave = (resp: Response) =>
    resp.url().includes('/comment') && ['POST', 'PUT', 'PATCH'].includes(resp.request().method());

  const assertRow = async (subject: string, label: string) => {
    const row = commentPage.rowByName(subject);
    await expect.soft(row, `${label}: "${subject}" should appear in search results`).toBeVisible({ timeout: 15000 });
    await expect.soft(row, `${label}: row should contain subject`).toContainText(subject);
  };

  // Soft-step runner: a bug in one step is LOGGED but never aborts the chain.
  // Soft asserts still mark the test failed at the end, so bugs stay visible.
  const stepFailed: string[] = [];
  async function step(label: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      const shot = (err as any)?.screenshot;
      if (shot) await testInfo.attach(`validation-error-${label}`, { body: shot, contentType: 'image/png' }).catch(() => {});
      const msg = (err as Error).message.split('\n')[0];
      const frames = ((err as Error).stack || '').split('\n').slice(1, 5).join('\n');
      console.log(`Bug logged, continuing — ${label} failed: ${msg}`);
      if (frames) console.log(frames);
      expect.soft(false, `${label} step failed: ${msg}`).toBeTruthy();
      stepFailed.push(label);
    }
  }

  let editSubject = '';
  let duplicateSubject = '';
  let viewEditSubject = '';

  // -- 1. CREATE -----------------------------------------
  await step('CREATE', async () => {
    console.log('Creating comment:', commentData.subject);
    const createResPromise = page.waitForResponse(isCommentSave, { timeout: 20000 });
    await commentPage.createComment(commentData);
    const createRes = await createResPromise;
    await commentPage.waitForDetailPage();

    const body = await createRes.json();
    const commentId = body?.commentid ?? body?.id ?? body?.[0]?.commentid ?? body?.[0]?.id;
    console.log('Comment ID:', commentId);

    expect.soft(createRes.ok(), 'POST /comment should return 2xx').toBeTruthy();
    expect.soft(commentId, 'commentid should be present in response').toBeTruthy();
    // Record must exist after Save: detail page shows it and API returned its id
    await expect.soft(page.getByText(commentData.subject, { exact: true }).first(), 'Create: detail page should show the new record').toBeVisible({ timeout: 15000 });
    expect.soft(createRes.ok() && !!commentId, 'Record should be created successfully on Save').toBeTruthy();
  });


  // -- 2. SEARCH -----------------------------------------
  await step('SEARCH', async () => {
    await commentPage.findComment(commentData.subject);
    await expect.soft(commentPage.searchSubjectInput, 'Search: subject filter should hold the searched subject').toHaveValue(commentData.subject);
    await assertRow(commentData.subject, 'Search');
    console.log('Search verified — comment found in list');

    // Clear-search coverage: X icon may be absent, so never fail the chain here
    try {
      await commentPage.clearSearch();
      await expect.soft(commentPage.searchSubjectInput, 'Clear (X): subject filter should be cleared').toHaveValue('');
      console.log('Clear search verified — filter cleared');
    } catch (err) {
      console.log('Clear search skipped (X icon absent):', (err as Error).message);
    }
  });

  // -- 3. EDIT (list pencil icon) — update subject ---
  await step('EDIT', async () => {
    editSubject = generateNewCommentSubject(usedSubjects);

    await commentPage.findComment(commentData.subject);
    await commentPage.clickEdit(commentData.subject);
    await expect.soft(commentPage.subject, 'Edit: form should be prefilled with current subject').toHaveValue(commentData.subject);
    await commentPage.subject.fill(editSubject);

    const editResPromise = page.waitForResponse(isCommentSave, { timeout: 20000 });
    const saveResult = await commentPage.saveAndWaitForResult();
    if (!saveResult.saved) {
      const blockedErr: any = new Error(`Save blocked by app validation: ${saveResult.message}`);
      blockedErr.screenshot = saveResult.screenshot;
      throw blockedErr;
    }
    expect.soft((await editResPromise).ok(), 'Edit save should return 2xx').toBeTruthy();
    await commentPage.waitForDetailPage();

    await commentPage.findComment(editSubject);
    await assertRow(editSubject, 'Edit');
    console.log(`Edit verified — "${commentData.subject}" renamed to "${editSubject}"`);
  });

  // -- 4. DUPLICATE (list copy icon) — update subject --
  await step('DUPLICATE', async () => {
    duplicateSubject = generateNewCommentSubject(usedSubjects);

    await commentPage.clickDuplicate(editSubject || commentData.subject);
    await expect.soft(commentPage.commentsText, 'Duplicate: comments text should be copied').toHaveValue(commentData.comments);
    await commentPage.subject.fill(duplicateSubject);

    const dupResPromise = page.waitForResponse(isCommentSave, { timeout: 20000 });
    const saveResult = await commentPage.saveAndWaitForResult();
    if (!saveResult.saved) {
      const blockedErr: any = new Error(`Save blocked by app validation: ${saveResult.message}`);
      blockedErr.screenshot = saveResult.screenshot;
      throw blockedErr;
    }
    expect.soft((await dupResPromise).ok(), 'Duplicate save should return 2xx').toBeTruthy();
    await commentPage.waitForDetailPage();

    await commentPage.findComment(duplicateSubject);
    await assertRow(duplicateSubject, 'Duplicate');
    console.log(`Duplicate verified — renamed to "${duplicateSubject}"`);
  });

  // -- 5. VIEW (list eye icon) ? detail page ? Edit button --
  await step('VIEW', async () => {
    viewEditSubject = generateNewCommentSubject(usedSubjects);

    await commentPage.clickView(duplicateSubject || editSubject || commentData.subject);

    await expect.soft(page, 'View: should open comment detail page').toHaveURL(/#\/home\/comments\/detail\/\d+/);
    await expect.soft(page.getByText(duplicateSubject || editSubject || commentData.subject, { exact: true }).first(), 'View: subject should be shown').toBeVisible({ timeout: 15000 });

    await commentPage.clickDetailEdit();
    await expect.soft(commentPage.subject, 'Detail Edit: form should be prefilled with current subject').toHaveValue(duplicateSubject || editSubject || commentData.subject);
    await commentPage.subject.fill(viewEditSubject);

    const viewResPromise = page.waitForResponse(isCommentSave, { timeout: 20000 });
    await commentPage.save();
    const saveResult = await commentPage.saveAndWaitForResult();
    if (!saveResult.saved) {
      const blockedErr: any = new Error(`Save blocked by app validation: ${saveResult.message}`);
      blockedErr.screenshot = saveResult.screenshot;
      throw blockedErr;
    }
    await commentPage.waitForDetailPage();

    await commentPage.findComment(viewEditSubject);
    await assertRow(viewEditSubject, 'Detail Edit');
    console.log(`View + Edit verified — renamed to "${viewEditSubject}"`);
  });

  // -- 6. BULK EDIT — tick first 2 rows ? Select Actions ? Edit Comments ? Comment By --
  await step('BULK EDIT', async () => {
    const newAssignee = /^Sonam Burbure$/;

    await commentPage.navigateToList();
    await expect.soft(page, 'Bulk Edit: should be on Comments list page').toHaveURL(/#\/home\/comments$/);
    // Reset the subject filter via the X icon beside Search so the full list returns
    if (await commentPage.clearSearchBtn.isVisible().catch(() => false)) {
      await commentPage.clearSearch();
      await expect.soft(commentPage.searchSubjectInput, 'Clear (X): subject filter should be cleared').toHaveValue('');
      console.log('Filter cleared via X — full comment list restored');
    }
    await page.locator('tbody tr input[type="checkbox"]').first().waitFor({ state: 'visible' });

    const firstTwoRows = [0, 1].map((i) => page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).nth(i));
    const bulkSubjects: string[] = [];
    for (const row of firstTwoRows) {
      const subject = (await row.locator('td').nth(1).innerText()).trim();
      bulkSubjects.push(subject);

      const checkbox = commentPage.rowCheckbox(row);
      await checkbox.check();
      await expect.soft(checkbox, `Bulk Edit: "${subject}" should be ticked`).toBeChecked();
    }
    console.log('Ticked first 2 comments:', bulkSubjects.join(' & '));

    await commentPage.chooseBulkAction(/^Edit Comments?$/);
    await expect.soft(page, 'Bulk Edit: should open Edit Selected Records page').toHaveURL(/#\/home\/comments\/add-edit/);
    await expect.soft(page.getByText('Edit Selected Records'), 'Bulk Edit: page title should be shown').toBeVisible();

    const assigneeLabel = await commentPage.selectOptionByText(commentPage.commentBy, newAssignee);
    await expect.soft(commentPage.commentBy.locator('option:checked'), 'Bulk Edit: Comment By should be selected').toHaveText(assigneeLabel);

    const bulkResPromise = page.waitForResponse(isCommentSave, { timeout: 20000 });
    await commentPage.save();
    expect.soft((await bulkResPromise).ok(), 'Bulk Edit save should return 2xx').toBeTruthy();
    console.log(`Bulk Edit saved — Comment By: "${assigneeLabel}"`);
  });

  if (stepFailed.length) {
    console.log(`Chain finished with logged bugs in: ${stepFailed.join(', ')}`);
  } else {
    console.log(`Comment UI chain complete — created "${commentData.subject}", edited to "${editSubject}", duplicated to "${duplicateSubject}", detail-edited to "${viewEditSubject}"`);
  }
});