import { EventApi } from '../api/EventApi.js';
import { BarcardApi } from '../api/BarcardApi.js';

export async function createEventAndBarCard(
  eventApi: EventApi,
  barCardApi: BarcardApi,
  eventPayload: any,
  barCardPayload: any
) {
  // 1️⃣ Create Event
  const createdEvent = await eventApi.createEvent(eventPayload);

  console.log('🔥 Event API Response:', JSON.stringify(createdEvent, null, 2));

  let eventId;

  if (Array.isArray(createdEvent)) {
    eventId = createdEvent[0]?.eventid;
  } else if (createdEvent?.eventid) {
    eventId = createdEvent.eventid;
  } else if (createdEvent?.data?.eventid) {
    eventId = createdEvent.data.eventid;
  } else if (Array.isArray(createdEvent?.data)) {
    eventId = createdEvent.data[0]?.eventid;
  }

  if (!eventId) {
    console.error('❌ Event creation failed. Full response:', createdEvent);
    throw new Error('Event ID not found');
  }

  // 2️⃣ Clone payload safely + add required root fields
const updatedBarCardPayload = {
  ...barCardPayload,

  // ✅ REQUIRED FIELDS (ROOT LEVEL)
  assign_to: barCardPayload?.assign_to ?? 6,
  createtime: new Date().toISOString(),
  modifiedtime: new Date().toISOString(),

  custom: {
    ...barCardPayload?.custom,
    related_event: eventId,
  },
};

  // 3️⃣ Create Bar Card
  const createdBarCard = await barCardApi.createBarCard(updatedBarCardPayload);

  console.log('🔥 Bar Card API Response:', JSON.stringify(createdBarCard, null, 2));

  let barCardId;

  if (Array.isArray(createdBarCard)) {
    barCardId = createdBarCard[0]?.eventbarcardid;
  } else if (createdBarCard?.eventbarcardid) {
    barCardId = createdBarCard.eventbarcardid;
  } else if (createdBarCard?.data?.eventbarcardid) {
    barCardId = createdBarCard.data.eventbarcardid;
  } else if (Array.isArray(createdBarCard?.data)) {
    barCardId = createdBarCard.data[0]?.eventbarcardid;
  }

  if (!barCardId) {
    console.error('❌ Bar Card creation failed. Full response:', createdBarCard);
    throw new Error('Bar Card ID not found');
  }

  return { eventId, barCardId };
}
