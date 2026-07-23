import { test, expect, Response } from '@playwright/test';
import { CreateEventPage } from '../../src/pages/CreateEventPage.js';

test('Create Event UI Test', async ({ page }) => {
  await page.goto(process.env.BASE_UI_URL + '#/home/events');

  const createEventPage = new CreateEventPage(page);
  await createEventPage.createEvent();

  const response = await page.waitForResponse(
    (resp: Response) =>
      resp.url().includes('/event') && resp.request().method() === 'POST',
    { timeout: 60000 }
  );

  const body = await response.json();
  console.log('Full response body:', body);

  // ✅ Corrected assignment
  const eventId = body?.[0]?.eventid;
  console.log('🎯 Event ID:', eventId);

  expect(response.ok()).toBeTruthy();
  expect(eventId).toBeTruthy();
});