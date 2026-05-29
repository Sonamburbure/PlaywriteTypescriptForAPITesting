import { createInterface } from 'readline';
import dotenv from 'dotenv';
import {
  toolCreateEvent,
  toolCreateBarsetup,
  toolCreateItemserved,
  toolCreateMenu,
  toolAddMenuItem,
  toolCreateBarcard,
  toolRunAutopreplan,
} from './tools.js';

const envFile = process.env.ENV_FILE ?? '.env.dev';
dotenv.config({ path: envFile });

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise(resolve => rl.question(q, resolve));

function askWithDefault(prompt: string, defaultValue: string): Promise<string> {
  return ask(`${prompt} [${defaultValue}]: `).then(v => v.trim() || defaultValue);
}

function sep() { console.log('─'.repeat(55)); }
function ok(msg: string) { console.log(`  ✅  ${msg}`); }
function step(n: number, title: string) {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  STEP ${n}: ${title}`);
  console.log('═'.repeat(55));
}

async function run() {
  console.log('\n' + '═'.repeat(55));
  console.log('  🍸  AutomateEvents — Event Setup Wizard');
  console.log('  Environment: ' + envFile);
  console.log('═'.repeat(55));
  console.log('  Answer each question (press Enter to use default)\n');

  // ── STEP 1: Event details ──────────────────────────────────
  step(1, 'Event Details');
  const eventName      = await askWithDefault('Event name',        'Grand Corporate Gala');
  const guestCountStr  = await askWithDefault('Number of guests',  '200');
  const startDate      = await askWithDefault('Start date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
  const endDate        = await askWithDefault('End date   (YYYY-MM-DD)', startDate);
  const startTime      = await askWithDefault('Bar open time  (HH:MM)',  '18:00');
  const endTime        = await askWithDefault('Bar close time (HH:MM)',  '23:00');
  const information    = await askWithDefault('Event description',  'Full service event with cocktail bar, professional equipment and dedicated staffing.');

  console.log('\n  Creating event...');
  const event = await toolCreateEvent({
    event_name: eventName,
    no_of_guest: parseInt(guestCountStr),
    event_start_date: startDate,
    event_end_date: endDate,
    daily_start_time: startTime,
    daily_end_time: endTime,
    information,
  });
  ok(event.message);

  // ── STEP 2: Bar Setup ──────────────────────────────────────
  step(2, 'Bar Setup');
  const barsetupName = await askWithDefault('Bar setup name', `${eventName} Bar Setup`);

  console.log('\n  Creating bar setup (product, equipment & staff)...');
  const barsetup = await toolCreateBarsetup({ name: barsetupName });
  ok(barsetup.message);

  // ── STEP 3: Items Served ───────────────────────────────────
  step(3, 'Items Served (Drinks/Cocktails)');
  const itemsServed: { itemservedid: number; itemserved_name: string }[] = [];

  let addMore = true;
  let itemCount = 1;
  while (addMore) {
    const defaultName = itemCount === 1 ? `${eventName} Signature Cocktail` : `${eventName} Special ${itemCount}`;
    const itemName = await askWithDefault(`Item served #${itemCount} name`, defaultName);
    console.log(`\n  Creating item served (ingredient, equipment & staff)...`);
    const item = await toolCreateItemserved({ name: itemName });
    ok(item.message);
    itemsServed.push({ itemservedid: item.itemservedid, itemserved_name: item.itemserved_name });
    itemCount++;
    const more = await askWithDefault('Add another item served? (yes/no)', 'no');
    addMore = more.toLowerCase().startsWith('y');
  }

  // ── STEP 4: Menu ───────────────────────────────────────────
  step(4, 'Menu');
  const menuName = await askWithDefault('Menu name', `${eventName} Menu`);

  console.log('\n  Creating menu...');
  const menu = await toolCreateMenu({ menu_name: menuName });
  ok(menu.message);

  // ── STEP 5: Menu Items ─────────────────────────────────────
  step(5, 'Menu Items (Quantity Rates)');
  console.log('  Link each item served to the menu with a quantity rate.\n');

  for (const item of itemsServed) {
    console.log(`  Item: ${item.itemserved_name}`);
    const rateType   = await askWithDefault('  Rate type (person / hour)', 'person');
    const rateStr    = await askWithDefault('  Quantity rate', '5');
    const rate       = parseInt(rateStr);
    const itemLabel  = await askWithDefault('  Display name for this menu item', `${menuName} — ${item.itemserved_name}`);

    const menuItemArgs: any = {
      item_name:    itemLabel,
      eventmenuid:  menu.eventmenuid,
      itemservedid: item.itemservedid,
    };
    if (rateType.toLowerCase().startsWith('h')) {
      menuItemArgs.conv_person_hour = rate;
    } else {
      menuItemArgs.conv_person = rate;
    }

    console.log('  Creating menu item...');
    const mi = await toolAddMenuItem(menuItemArgs);
    ok(mi.message);
    sep();
  }

  // ── STEP 6: BarCard ────────────────────────────────────────
  step(6, 'BarCard');
  console.log('  Linking event, bar setup and menu together...');
  const barcard = await toolCreateBarcard({
    eventid:          event.eventid,
    barsetupid:       barsetup.barsetupid,
    eventmenuid:      menu.eventmenuid,
    event_start_date: startDate,
    event_end_date:   endDate,
    daily_start_time: startTime,
    daily_end_time:   endTime,
  });
  ok(barcard.message);

  // ── STEP 7: AutoPreplan ────────────────────────────────────
  step(7, 'AutoPreplan');
  console.log('  Running autopreplan...');
  const preplan = await toolRunAutopreplan({ eventid: event.eventid });
  ok(preplan.message);

  // ── SUMMARY ────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log('  🎉  EVENT SETUP COMPLETE');
  console.log('═'.repeat(55));
  console.log(`  Event       : ${eventName}  (ID: ${event.eventid})`);
  console.log(`  Guests      : ${guestCountStr}`);
  console.log(`  Date        : ${startDate} → ${endDate}  (${startTime}–${endTime})`);
  console.log(`  Bar Setup   : ${barsetupName}  (ID: ${barsetup.barsetupid})`);
  itemsServed.forEach(i => console.log(`  Item Served : ${i.itemserved_name}  (ID: ${i.itemservedid})`));
  console.log(`  Menu        : ${menuName}  (ID: ${menu.eventmenuid})`);
  console.log(`  BarCard     : ID ${barcard.barcardid}`);
  console.log(`  AutoPreplan : ${preplan.status}`);
  console.log('═'.repeat(55) + '\n');
}

run()
  .catch(err => console.error('\n❌  Error:', err?.message ?? err))
  .finally(() => rl.close());
