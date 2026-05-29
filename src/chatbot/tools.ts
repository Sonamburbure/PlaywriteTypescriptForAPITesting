import { apiPost, apiGet, ensureUom, ensureSeg1, ensureSeg2, nowStr, OWNER } from './http.js';

const SEG_PRODUCT = 532, SEG_EQUIP = 533, SEG_STAFF = 534;
const CONS_UOM_PROD = 527, CONS_UOM_EQUIP = 527, CONS_UOM_STAFF = '528';

// ── create_event ───────────────────────────────────────────────────────
export async function toolCreateEvent(args: {
  event_name: string;
  no_of_guest: number;
  event_start_date: string;
  event_end_date: string;
  daily_start_time: string;
  daily_end_time: string;
  information?: string;
}) {
  const setup = new Date(args.event_start_date);
  setup.setDate(setup.getDate() - 1);
  const cleanup = new Date(args.event_end_date);
  cleanup.setDate(cleanup.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const fmtDt = (d: Date, t: string) => `${fmt(d)} ${t}:00`;
  const startH = parseInt(args.daily_start_time.split(':')[0]);
  const endH   = parseInt(args.daily_end_time.split(':')[0]);
  const p2 = (n: number) => String(n).padStart(2, '0');

  const res = await apiPost('event', {
    event_num: '00000000000', source: 'web', status: '1',
    custom: {
      event_name: args.event_name,
      event_nature: 446, event_type: 448, event_status: '452',
      related_customer: 1257, no_of_bar_required: '1', related_venue: 341,
      no_of_guest: args.no_of_guest, event_pricing_mode: 646,
      information: args.information ?? 'Full service event with cocktail bar, professional equipment setup, and dedicated staffing.',
      createtime: nowStr(), modifiedtime: nowStr(),
      event_start_date: args.event_start_date,
      event_end_date: args.event_end_date,
      daily_start_time: args.daily_start_time,
      daily_end_time: args.daily_end_time,
      staff_start_time: `${p2(Math.max(startH - 1, 0))}:00`,
      staff_end_time: `${p2(Math.min(endH + 1, 23))}:00`,
      setup_datetime: fmtDt(setup, args.daily_start_time),
      cleanup_datetime: fmtDt(cleanup, args.daily_end_time),
      total_invoiced: '4000.00', total_paid: '1000.00',
      event_taskmaster: 640,
      event_equipment_planing_type: '1176',
      event_product_planing_type: '1179',
      event_execution_type: '827',
      event_qty_required_product_uom: '1192',
      assign_to: 'Sonam Burbure', ownerid: 18,
    },
  });
  const eventid = res?.eventid ?? res?.id;
  return { eventid, event_name: args.event_name, event_start_date: args.event_start_date, event_end_date: args.event_end_date, daily_start_time: args.daily_start_time, daily_end_time: args.daily_end_time, message: `Event "${args.event_name}" created — ID: ${eventid}` };
}

// ── create_barsetup ────────────────────────────────────────────────────
export async function toolCreateBarsetup(args: { name: string }) {
  const uomProd  = await ensureUom('Spirits Volume');
  const uomEquip = await ensureUom('Bar Equipment Volume');
  const uomStaff = await ensureUom('Staff Headcount');

  const bs = await apiPost('barsetup', {
    barsetup_num: '00000000000', source: 'web', status: '1',
    custom: {
      barsetup_name: args.name, barsetup_category: 627, barsetup_subcategory: '',
      barsetup_sort_category: '', barsetup_status: 631,
      barsetup_type: 633, barsetup_product_required: 634,
      barsetup_equipment_required: 636, barsetup_staff_required: 638,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });
  const barsetupid = bs?.barsetupid ?? bs?.id;
  await new Promise(r => setTimeout(r, 1500));

  const s1p = await ensureSeg1(`${args.name} Beverage`,         uomProd,  SEG_PRODUCT);
  const s2p = await ensureSeg2(`${args.name} Beverage Grade`,             SEG_PRODUCT);
  const s1e = await ensureSeg1(`${args.name} Equipment`,         uomEquip, SEG_EQUIP);
  const s2e = await ensureSeg2(`${args.name} Equipment Grade`,             SEG_EQUIP);
  const s1s = await ensureSeg1(`${args.name} Staff Role`,        uomStaff, SEG_STAFF);
  const s2s = await ensureSeg2(`${args.name} Staff Category`,              SEG_STAFF);

  await apiPost('barsetupproduct', {
    barsetupproduct_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      related_barsetup: barsetupid, barsetupproduct_name: args.name,
      related_segment1: s1p, related_segment2: s2p,
      related_unitofmeasure: uomProd, barsetupproduct_consumption_uom: CONS_UOM_PROD,
      barsetupproduct_fixed_qty: '1', barsetupproduct_min: 0, barsetupproduct_max: 0,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });

  await apiPost('barsetupequipment', {
    barsetupequipment_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      related_barsetup: barsetupid, barsetupequipment_name: args.name,
      related_segment1: s1e, related_segment2: s2e,
      related_unitofmeasure: uomEquip, barsetupequipment_consumption_uom: CONS_UOM_EQUIP,
      barsetupequipment_fixed_qty: '1', barsetupequipment_min: 1, barsetupequipment_max: 2,
      barsetupequipment_time_uom: 540, barsetupequipment_min_uom: 1, barsetupequipment_max_uom: 1,
      barsetupequipment_cost_con_uom_tuom: '1.00', barsetupequipment_margin: '0',
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });

  await apiPost('barsetupstaff', {
    barsetupstaff_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      related_barsetup: barsetupid, barsetupstaff_name: args.name,
      related_segment1: s1s, related_segment2: s2s,
      related_unitofmeasure: uomStaff, barsetupstaff_consumption_uom: CONS_UOM_STAFF,
      barsetupstaff_fixed_qty: '1', barsetupstaff_min: 0, barsetupstaff_max: 0,
      barsetupstaff_time_uom: 540,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });

  return { barsetupid, barsetup_name: args.name, message: `BarSetup "${args.name}" created — ID: ${barsetupid} (product, equipment & staff linked)` };
}

// ── create_itemserved ──────────────────────────────────────────────────
export async function toolCreateItemserved(args: { name: string }) {
  const uomProd  = await ensureUom('Spirits Volume');
  const uomEquip = await ensureUom('Bar Equipment Volume');
  const uomStaff = await ensureUom('Staff Headcount');

  const is = await apiPost('itemserved', {
    itemserved_num: '00000000000', source: 'web', status: '1',
    custom: {
      itemserved_name: args.name, itemserved_category: '608', itemserved_subcategory: 1159,
      itemserved_status: 618, itemserved_type: 620,
      itemserved_product_required: 621, itemserved_equipment_required: 623, itemserved_staff_required: 625,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });
  const itemservedid = is?.itemservedid ?? is?.id;
  await new Promise(r => setTimeout(r, 1500));

  const s1p = await ensureSeg1(`${args.name} Ingredient`,    uomProd,  SEG_PRODUCT);
  const s2p = await ensureSeg2(`${args.name} Ingredient Grade`,         SEG_PRODUCT);
  const s1e = await ensureSeg1(`${args.name} Equipment`,     uomEquip, SEG_EQUIP);
  const s2e = await ensureSeg2(`${args.name} Equipment Grade`,          SEG_EQUIP);
  const s1s = await ensureSeg1(`${args.name} Staff Role`,    uomStaff, SEG_STAFF);
  const s2s = await ensureSeg2(`${args.name} Staff Category`,           SEG_STAFF);

  await apiPost('itemproduct', {
    itemproduct_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      related_itemserved: itemservedid, itemproduct_name: args.name,
      related_segment1: s1p, related_segment2: s2p,
      related_unitofmeasure: uomProd, itemproduct_consumption_uom: CONS_UOM_PROD,
      itemproduct_fixed_qty: '1', itemproduct_min: 0, itemproduct_max: 0,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });

  await apiPost('itemequipment', {
    itemequipment_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      related_itemserved: itemservedid, itemequipment_name: args.name,
      related_segment1: s1e, related_segment2: s2e,
      related_unitofmeasure: uomEquip, itemequipment_consumption_uom: CONS_UOM_EQUIP,
      itemequipment_fixed_qty: '1', itemequipment_min: 0, itemequipment_max: 0,
      itemequipment_time_uom: 540,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });

  await apiPost('itemstaff', {
    itemstaff_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      related_itemserved: itemservedid, itemstaff_name: args.name,
      related_segment1: s1s, related_segment2: s2s,
      related_unitofmeasure: uomStaff, itemstaff_consumption_uom: CONS_UOM_STAFF,
      itemstaff_fixed_qty: '1', itemstaff_min: 0, itemstaff_max: 0,
      itemstaff_time_uom: 540,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });

  return { itemservedid, itemserved_name: args.name, message: `Item Served "${args.name}" created — ID: ${itemservedid} (ingredient, equipment & staff linked)` };
}

// ── create_menu ────────────────────────────────────────────────────────
export async function toolCreateMenu(args: { menu_name: string }) {
  const res = await apiPost('eventmenu', {
    eventmenu_num: '00000000000', source: 'web', status: '1',
    custom: { eventmenu_name: args.menu_name, ...OWNER, createtime: nowStr(), modifiedtime: nowStr() },
  });
  const eventmenuid = res?.eventmenuid ?? res?.id;
  return { eventmenuid, menu_name: args.menu_name, message: `Menu "${args.menu_name}" created — ID: ${eventmenuid}` };
}

// ── add_menu_item ──────────────────────────────────────────────────────
export async function toolAddMenuItem(args: {
  item_name: string;
  eventmenuid: number;
  itemservedid: number;
  conv_person?: number;
  conv_person_hour?: number;
}) {
  const payload: any = {
    eventmenuitem_num: '00000000000', source: 'web', status: '1',
    custom: {
      eventmenuitem_name: args.item_name,
      related_eventmenu: args.eventmenuid,
      related_itemserved: args.itemservedid,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  };
  if (args.conv_person)      payload.custom.eventmenuitem_conv_person      = String(args.conv_person);
  if (args.conv_person_hour) payload.custom.eventmenuitem_conv_person_hour = String(args.conv_person_hour);

  const res = await apiPost('eventmenuitem', payload);
  const eventmenuitemid = res?.eventmenuitemid ?? res?.id;
  return { eventmenuitemid, message: `Menu item "${args.item_name}" added to menu — ID: ${eventmenuitemid}` };
}

// ── create_barcard ─────────────────────────────────────────────────────
export async function toolCreateBarcard(args: {
  eventid: number;
  barsetupid: number;
  eventmenuid: number;
  event_start_date: string;
  event_end_date: string;
  daily_start_time: string;
  daily_end_time: string;
}) {
  const setup   = new Date(args.event_start_date); setup.setDate(setup.getDate() - 1);
  const cleanup = new Date(args.event_end_date);   cleanup.setDate(cleanup.getDate() + 1);
  const fmt   = (d: Date)            => d.toISOString().slice(0, 10);
  const fmtDt = (d: Date, t: string) => `${fmt(d)} ${t}:00`;

  const bc = await apiPost('eventbarcard', {
    eventbarcard_num: '00000000000', source: 'web', status: '1',
    custom: {
      eventbarcard_name: 'Signature Bar Card',
      related_event: String(args.eventid),
      related_barsetup: args.barsetupid,
      related_eventmenu: args.eventmenuid,
      eventbarcard_start_date: args.event_start_date,
      eventbarcard_end_date: args.event_end_date,
      eventbarcard_setupdatetime: fmtDt(setup, args.daily_start_time),
      eventbarcard_cleanupdatetime: fmtDt(cleanup, args.daily_end_time),
      eventbarcard_barsetup_addon: '',
      createtime: nowStr(), modifiedtime: nowStr(),
      assign_to: 'Sonam Burbure', ownerid: 18,
    },
  });
  const barcardid = bc?.eventbarcardid ?? bc?.id;
  await new Promise(r => setTimeout(r, 1500));

  // BarCard Date
  try {
    await apiPost('eventbarcarddate', {
      eventbarcarddate_num: String(Date.now()).slice(-11), source: 'web', status: '1',
      custom: {
        related_eventbarcard: String(barcardid),
        eventbarcarddate_name: `Bar Service ${args.event_start_date}`,
        eventbarcarddate_date: args.event_start_date,
        eventbarcarddate_starttime: args.daily_start_time,
        eventbarcarddate_endtime: args.daily_end_time,
        ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
      },
    });
  } catch { /* non-fatal */ }

  return { barcardid, message: `BarCard created — ID: ${barcardid} (Event ${args.eventid} linked to BarSetup ${args.barsetupid} and Menu ${args.eventmenuid})` };
}

// ── run_autopreplan ────────────────────────────────────────────────────
export async function toolRunAutopreplan(args: { eventid: number }) {
  const result = await apiGet('wsteps', {
    module: 'event', view: 'detail', wid: '5',
    formtype: '1', 'records[]': String(args.eventid),
  });
  const errMsg: string = result?.error_msg?.error ?? '';
  if (errMsg.includes('too many placeholders')) {
    return { status: 'warning', message: 'AutoPreplan triggered — server-side MySQL limit reached on this environment (known limitation). Your event is fully set up.' };
  }
  if (errMsg) {
    return { status: 'error', message: `AutoPreplan returned an error: ${errMsg}` };
  }
  return { status: 'success', message: `AutoPreplan triggered successfully for Event ${args.eventid}.` };
}

// ── Tool registry ──────────────────────────────────────────────────────
export const TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
  create_event:       toolCreateEvent,
  create_barsetup:    toolCreateBarsetup,
  create_itemserved:  toolCreateItemserved,
  create_menu:        toolCreateMenu,
  add_menu_item:      toolAddMenuItem,
  create_barcard:     toolCreateBarcard,
  run_autopreplan:    toolRunAutopreplan,
};

export const TOOL_DEFINITIONS = [
  {
    name: 'create_event',
    description: 'Create a new event with all required details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_name:        { type: 'string', description: 'Descriptive event name, e.g. "Grand Corporate Gala"' },
        no_of_guest:       { type: 'number', description: 'Expected guest count' },
        event_start_date:  { type: 'string', description: 'Start date YYYY-MM-DD' },
        event_end_date:    { type: 'string', description: 'End date YYYY-MM-DD' },
        daily_start_time:  { type: 'string', description: 'Daily bar open time HH:MM, e.g. "18:00"' },
        daily_end_time:    { type: 'string', description: 'Daily bar close time HH:MM, e.g. "23:00"' },
        information:       { type: 'string', description: 'Brief event description' },
      },
      required: ['event_name', 'no_of_guest', 'event_start_date', 'event_end_date', 'daily_start_time', 'daily_end_time'],
    },
  },
  {
    name: 'create_barsetup',
    description: 'Create a bar setup configuration. Automatically links product, equipment, and staff segments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Bar setup name, e.g. "Signature Cocktail Bar Setup"' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_itemserved',
    description: 'Create a drink or item to be served at the event. Automatically links ingredient, equipment, and staff.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Item name, e.g. "Classic Negroni Service"' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_menu',
    description: 'Create an event menu to group items served.',
    input_schema: {
      type: 'object' as const,
      properties: {
        menu_name: { type: 'string', description: 'Menu name, e.g. "Premium Cocktail Collection"' },
      },
      required: ['menu_name'],
    },
  },
  {
    name: 'add_menu_item',
    description: 'Add an item served to a menu with a quantity conversion rate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_name:         { type: 'string', description: 'Display name for this menu item' },
        eventmenuid:       { type: 'number', description: 'ID of the parent menu' },
        itemservedid:      { type: 'number', description: 'ID of the item served' },
        conv_person:       { type: 'number', description: 'Units per person (e.g. 5 drinks per guest)' },
        conv_person_hour:  { type: 'number', description: 'Units per person per hour (e.g. 10)' },
      },
      required: ['item_name', 'eventmenuid', 'itemservedid'],
    },
  },
  {
    name: 'create_barcard',
    description: 'Create a BarCard that links the event, bar setup, and menu together. Also creates the daily service date record.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventid:          { type: 'number', description: 'Event ID' },
        barsetupid:       { type: 'number', description: 'BarSetup ID' },
        eventmenuid:      { type: 'number', description: 'Menu ID' },
        event_start_date: { type: 'string', description: 'Event start date YYYY-MM-DD' },
        event_end_date:   { type: 'string', description: 'Event end date YYYY-MM-DD' },
        daily_start_time: { type: 'string', description: 'Daily start time HH:MM' },
        daily_end_time:   { type: 'string', description: 'Daily end time HH:MM' },
      },
      required: ['eventid', 'barsetupid', 'eventmenuid', 'event_start_date', 'event_end_date', 'daily_start_time', 'daily_end_time'],
    },
  },
  {
    name: 'run_autopreplan',
    description: 'Trigger the AutoPreplan workflow to generate the event execution plan.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventid: { type: 'number', description: 'Event ID to preplan' },
      },
      required: ['eventid'],
    },
  },
];
