import { test, expect, Response } from '@playwright/test';
import { CreateEventPage } from '../../src/pages/CreateEventPage.js';
import { BarcardAndAutoPreplanPage } from '../../src/pages/BarcardAndAutoPreplanPage.js';

test('Create Event + Barcard + AutoPreplan UI Test', async ({ page }) => {
await page.goto('https://web.automateevents.com/#/home/event/detail/136');
 // await page.goto(process.env.BASE_UI_URL!);

  const createEventPage = new CreateEventPage(page);
  await createEventPage.createEvent();
  

const response = await page.waitForResponse(
    (resp: Response) =>
      resp.url().includes('/event') && resp.request().method() === 'POST',
    { timeout: 60000 }
  );

  const body = await response.json();
 const eventId = body?.[0]?.eventid;

  console.log('🎯 Event ID:', eventId);

  expect(response.ok()).toBeTruthy();
  expect(eventId).toBeTruthy();

  // Barcard + Preplan
  const barcard = new BarcardAndAutoPreplanPage(page);

  await barcard.createBarCard();

  await barcard.createAutoPreplan();

});