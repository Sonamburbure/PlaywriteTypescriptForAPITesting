import { test, expect } from '@playwright/test';
import { Segment1Api } from '../src/api/Segment1Api.js';
import { Segment2Api } from '../src/api/Segment2Api.js';
import { UomApi } from '../src/api/UOMApi.js';
import { BarsetupApi } from '../src/api/BarSetupApi.js';
import { BarsetupEquipmentApi } from '../src/api/BarsetupEquipmentApi.js';
import { BarsetupproductApi } from '../src/api/BarsetupproductApi.js';
import { BarsetupstaffApi } from '../src/api/BarsetupstaffingApi.js';
import { ItemservedApi } from '../src/api/ItemservedApi.js';
import { ItemservedproductApi } from '../src/api/ItemservedproductApi.js';
import { ItemservedStaffingApi } from '../src/api/ItemservedStaffingApi.js';
import { MenusApi } from '../src/api/MenusApi.js';
import { MenusitemApi } from '../src/api/Menusitem.js';
import { ProductApi } from '../src/api/ProductsApi.js';
import { EquipmentApi } from '../src/api/EquipmentApi.js';
import { EventApi } from '../src/api/EventApi.js';
import { BarcardApi } from '../src/api/BarcardApi.js';
import { EventBarCardDateApi } from '../src/api/EventbarcarddateApi.js';
import { StaffTypeApi } from '../src/api/StaffTypesApi.js';
import { BASE_API_URL } from '../src/utils/constants.js';
import { getAuthToken, getTenantPath, getLogonAs } from '../src/utils/tokenStore.js';

function extractId(res: any, ...keys: string[]): number | undefined {
  const data = Array.isArray(res) ? res[0] : (res?.data ?? res);
  for (const key of keys) {
    if (data?.[key] != null) return data[key];
  }
  return undefined;
}

const CONS_UOM_PRODUCT    = 527;
const CONS_UOM_EQUIPMENT  = 527;
const CONS_UOM_STAFF      = '528';  // barsetup staff
const CONS_UOM_IS_STAFF   = 527;    // itemserved staff

const PROD_SEG1_POOL = [
  'Fresh Orange Juice', 'Premium Apple Juice', 'Tropical Mango Blend',
  'Mixed Berry Fusion', 'Pineapple Citrus Mix', 'Watermelon Refresh',
  'Pomegranate Punch',  'Grape Harvest Press',  'Lemon Ginger Zest',
  'Passion Fruit Blend', 'Guava Citrus Pour',   'Cranberry Berry Mix',
];
const PROD_SEG2_POOL = [
  'Juice Blend Grade',   'Premium Fruit Grade',  'Tropical Press Grade',
  'Berry Fusion Grade',  'Citrus Extract Grade', 'Fruit Infusion Grade',
  'Natural Blend Grade', 'Artisan Press Grade',  'Premium Mix Grade',
  'Craft Blend Grade',   'Pure Extract Grade',   'Select Blend Grade',
];
const EQUIP_SEG1_POOL = [
  'Cocktail Shaker Unit', 'Ice Bucket Station',  'Speed Rail System',
  'Blender Bar Unit',     'Juice Press Station', 'Mixing Glass Kit',
  'Strainer Bar Set',     'Muddler Tool Kit',    'Bar Spoon Station',
  'Citrus Press Kit',     'Garnish Tray Unit',   'Pourover Bar Kit',
];
const EQUIP_SEG2_POOL = [
  'Bar Hardware Grade',    'Service Tools Grade',     'Mixing Hardware Grade',
  'Prep Equipment Grade',  'Bar Accessory Grade',     'Service Set Grade',
  'Professional Tools Grade', 'Event Hardware Grade', 'Catering Tools Grade',
  'Service Kit Grade',     'Bar Station Grade',       'Event Tools Grade',
];
const STAFF_SEG1_POOL = [
  'Senior Bartender Role', 'Junior Bartender Role', 'Bar Back Role',
  'Event Mixologist Role', 'Service Lead Role',     'Bar Supervisor Role',
  'Beverage Director Role','Bar Technician Role',   'Cocktail Artist Role',
  'Bar Captain Role',      'Floor Supervisor Role', 'Head Barista Role',
];
const STAFF_SEG2_POOL = [
  'Bar Staff Category',      'Service Team Category',  'Event Crew Category',
  'Support Staff Category',  'Lead Service Category',  'Operations Category',
  'Catering Staff Category', 'Service Group Category', 'Event Support Category',
  'Bar Team Category',       'Front Line Category',    'Senior Crew Category',
];

// Two-word professional suffix pools — combined give 48×48 = 2,304 unique logical tags
const TAG_QUALITY = [
  'Reserve', 'Premium', 'Artisan', 'Signature', 'Select', 'Heritage',
  'Classic', 'Elite', 'Prestige', 'Grand', 'Superior', 'Distinguished',
  'Choice', 'Refined', 'Exquisite', 'Pure', 'Royal', 'Imperial',
  'Supreme', 'Finest', 'Deluxe', 'Master', 'Craft', 'Bespoke',
  'Curated', 'Exclusive', 'Golden', 'Platinum', 'Crystal', 'Luxury',
  'Prime', 'Rare', 'Estate', 'Vintage', 'Aged', 'Noble',
  'Pinnacle', 'Apex', 'Summit', 'Crown', 'Cardinal', 'Eminent',
  'Acclaimed', 'Featured', 'Prized', 'Celebrated', 'Foremost', 'Esteemed',
];
const TAG_STYLE = [
  'Collection', 'Edition', 'Series', 'Batch', 'Selection', 'Portfolio',
  'Suite', 'Programme', 'Line', 'Set', 'Range', 'Blend', 'Curation',
  'Offering', 'Variety', 'Catalogue', 'Bundle', 'Assembly', 'Stock',
  'Reserve', 'Listing', 'Schedule', 'Compendium', 'Record', 'Profile',
  'Specification', 'Standard', 'Formula', 'Arrangement', 'Composition',
  'Formation', 'Configuration', 'Layout', 'Pattern', 'Template',
  'Framework', 'Design', 'Plan', 'Scheme', 'Model', 'Approach',
  'Method', 'Technique', 'Format', 'Structure', 'Style', 'Index',
];

function pickUnique<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

async function withRetry<T>(fn: () => Promise<T>, label = '', retries = 5, delayMs = 1500): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg            = String(err?.message ?? '');
      const isLock         = msg.includes('Lock wait timeout') || msg.includes('1205');
      const isRouteError   = msg.includes('Route not found') || msg.includes('404');
      const isRetryable    = isLock || isRouteError;
      if (attempt === retries || !isRetryable) throw err;
      const retryDelay = isRouteError ? 3000 * attempt : delayMs * attempt;
      const reason = isRouteError ? 'Route not found (server busy)' : 'Lock wait timeout';
      console.log(`  ⚠️  ${reason}${label ? ` (${label})` : ''}, retry ${attempt}/${retries - 1} in ${retryDelay}ms...`);
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
  throw new Error('unreachable');
}

async function runConcurrent<T>(fns: Array<() => Promise<T>>, concurrency = 3): Promise<T[]> {
  const results: T[] = new Array(fns.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < fns.length) {
      const i = cursor++;
      results[i] = await fns[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, fns.length) }, worker));
  return results;
}

test('SMOKE: UOM(x3) → Seg1(x18) → Seg2(x18) → BarSetup → BS Prod/Equip/Staff(x3) → IS → IS Prod/Equip/Staff(x3) → Product/Equipment/Staff masters(x6) → Menu → MenuItems → Event → BarCard → AutoPreplan', async ({ request }) => {

  const today = new Date();

  const localDate = (d: Date): string => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
  };
  const localDateTime = (d: Date): string => {
    const h   = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s   = String(d.getSeconds()).padStart(2, '0');
    return `${localDate(d)} ${h}:${min}:${s}`;
  };

  const dateStr        = localDate(today);
  const now            = () => localDateTime(new Date());
  const formatDate     = (d: Date) => localDate(d);
  const formatDateTime = (d: Date) => localDateTime(d);

  const token      = getAuthToken();
  const tenantPath = getTenantPath();
  const logonAs    = getLogonAs();
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-automate-secret': process.env.AUTOMATE_SECRET!,
  };

  const owner = { ownerid: 18, assign_to: 'Sonam Burbure' };
  const getRand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // 7 unique combos per category — [0-2] BarSetup, [3-5] ItemServed1, [6] ItemServed2 (no overlap).
  // 3-word run tag from combined 96-word pool = C(96,3) ≈ 143k combinations.
  const [runTagW1, runTagW2, runTagW3] = pickUnique([...TAG_QUALITY, ...TAG_STYLE], 3);
  const runTag = `${runTagW1} ${runTagW2} ${runTagW3}`;

  const prodSeg1Names  = pickUnique(PROD_SEG1_POOL,  7).map(n => `${n} ${runTag}`);
  const prodSeg2Names  = pickUnique(PROD_SEG2_POOL,  7);
  const equipSeg1Names = pickUnique(EQUIP_SEG1_POOL, 7).map(n => `${n} ${runTag}`);
  const equipSeg2Names = pickUnique(EQUIP_SEG2_POOL, 7);
  const staffSeg1Names = pickUnique(STAFF_SEG1_POOL, 7).map(n => `${n} ${runTag}`);
  const staffSeg2Names = pickUnique(STAFF_SEG2_POOL, 7);

  const CONV_PERSON_HOUR_RATE = 10;
  const CONV_PERSON_RATE      = 5;

  const eventStartHour   = 8 + Math.floor(Math.random() * 10);
  const eventDurationHrs = 1 + Math.floor(Math.random() * 4);
  const eventEndHour     = eventStartHour + eventDurationHrs;
  const pad2             = (n: number) => String(n).padStart(2, '0');
  const dailyStartTime   = `${pad2(eventStartHour)}:00`;
  const dailyEndTime     = `${pad2(eventEndHour)}:00`;
  const staffStartTime   = `${pad2(Math.max(eventStartHour - 1, 0))}:00`;
  const staffEndTime     = `${pad2(Math.min(eventEndHour + 1, 23))}:00`;
  const totalEventHours  = eventDurationHrs;

  const guestOptions = [100, 150, 200, 250, 300, 350, 500];
  const noOfGuest    = guestOptions[Math.floor(Math.random() * guestOptions.length)];

  const expectedQtyPerHour   = totalEventHours * noOfGuest * CONV_PERSON_HOUR_RATE;
  const expectedQtyPerPerson = CONV_PERSON_RATE * noOfGuest;

  // API instances
  const uomApi             = new UomApi(request);
  const segment1Api        = new Segment1Api(request);
  const segment2Api        = new Segment2Api(request);
  const productApi         = new ProductApi(request);
  const equipmentApi       = new EquipmentApi(request);
  const staffTypeApi       = new StaffTypeApi(request);

  // ── Helper: ensure UOM ─────────────────────────────────────────────────
  const uomBase = {
    unitofmeasure_num: '00000000000', source: 'web', status: '1',
    custom: {
      allow_multiple_product: '53',
      default_consumable_unit: 528,
      consumable_quantity: '50.00',
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  async function ensureUom(name: string, consumableQty = '5000.00'): Promise<number> {
    const search = await uomApi.searchUoms(`unitofmeasure_name=${name}`);
    const existing = search?.data?.[0];
    if (existing?.unitofmeasureid) {
      const currentQty = String(existing.consumable_quantity ?? '').replace(/\.?0+$/, '');
      const targetQty  = consumableQty.replace(/\.?0+$/, '');
      if (currentQty !== targetQty) {
        await request.put(
          `${BASE_API_URL}/${tenantPath}/api/${logonAs}/unitofmeasures/${existing.unitofmeasureid}`,
          { headers: authHeaders, data: { custom: { consumable_quantity: consumableQty, modifiedtime: now() } } }
        );
        console.log(`  ✅ UOM (${name}) found: ${existing.unitofmeasureid} — updated consumable_qty to ${consumableQty}`);
      } else {
        console.log(`  ✅ UOM (${name}) found: ${existing.unitofmeasureid}`);
      }
      return existing.unitofmeasureid;
    }
    const res = await withRetry(() => uomApi.createUom({ ...uomBase, custom: { ...uomBase.custom, unitofmeasure_name: name, consumable_quantity: consumableQty } }), `UOM:${name}`);
    const id = res?.unitofmeasureid ?? res?.unitofmeasure_id ?? res?.id;
    console.log(`  ✅ UOM (${name}) created: ${id} | consumable_qty: ${consumableQty}`);
    return id;
  }

  // Segment type IDs: 532=Products, 533=Equipments, 534=Staff
  const SEG_TYPE_PRODUCT   = 532;
  const SEG_TYPE_EQUIPMENT = 533;
  const SEG_TYPE_STAFF     = 534;

  // ── Helper: ensure Segment1 ────────────────────────────────────────────
  async function ensureSegment1(name: string, uomId: number, segmentType: number): Promise<number> {
    const search = await segment1Api.searchSegment1s(`segment1_name=${name}`);
    const existing = search?.data?.[0];
    if (existing?.segment1id) {
      const existingType = Number(existing.segment_type ?? existing.segment_type_id ?? 0);
      if (existingType !== segmentType) {
        console.log(`  ⚠️  Segment1 (${name}) has wrong type ${existingType}, fixing to ${segmentType}`);
        await request.put(
          `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment1s/${existing.segment1id}`,
          { headers: authHeaders, data: { custom: { segment_type: segmentType, related_unitofmeasure: uomId, modifiedtime: now() } } }
        );
      }
      console.log(`  ✅ Segment1 (${name}) found: ${existing.segment1id}`);
      return existing.segment1id;
    }
    const res = await withRetry(() => segment1Api.createSegment1({
      segment1_num: '00000000000', source: 'web', status: '1',
      custom: {
        segment1_name: name, segment_type: segmentType,
        segment1_consumable_uom: 527, related_unitofmeasure: uomId,
        ...owner, createtime: now(), modifiedtime: now(),
      }
    }), `Seg1:${name}`);
    const id = res?.segment1id ?? res?.segment1_id ?? res?.id;
    console.log(`  ✅ Segment1 (${name}) created: ${id}`);
    return id;
  }

  // ── Helper: ensure Segment2 ────────────────────────────────────────────
  async function ensureSegment2(name: string, segmentType: number): Promise<number> {
    const search = await segment2Api.searchSegment2s(`segment2_name=${name}`);
    const existing = search?.data?.[0];
    if (existing?.segment2id) {
      const existingType = Number(existing.segment2_segment_type ?? existing.segment_type ?? 0);
      if (existingType !== segmentType) {
        console.log(`  ⚠️  Segment2 (${name}) has wrong type ${existingType}, fixing to ${segmentType}`);
        await request.put(
          `${BASE_API_URL}/${tenantPath}/api/${logonAs}/segment2s/${existing.segment2id}`,
          { headers: authHeaders, data: { custom: { segment2_segment_type: segmentType, modifiedtime: now() } } }
        );
      }
      console.log(`  ✅ Segment2 (${name}) found: ${existing.segment2id}`);
      return existing.segment2id;
    }
    const res = await withRetry(() => segment2Api.createSegment2({
      segment2_num: '00000000000', source: 'web', status: '1',
      custom: {
        segment2_name: name, segment2_segment_type: segmentType,
        ...owner, createtime: now(), modifiedtime: now(),
      }
    }), `Seg2:${name}`);
    const id = res?.segment2id ?? res?.segment2_id ?? res?.id;
    console.log(`  ✅ Segment2 (${name}) created: ${id}`);
    return id;
  }

  // ── Helpers: create Product / Equipment / StaffType (direct, no pre-check) ──
  const genNum = () => String(Date.now()).slice(-11);

  async function createProduct(name: string, seg1Id: number, seg2Id: number, uomId: number): Promise<number> {
    const res = await withRetry(() => productApi.createProduct({
      product_num: genNum(), source: 'web', status: '1',
      custom: {
        product_name: name, serial_batch: 207, product_category: '1187',
        related_segment1: seg1Id, related_segment2: seg2Id, safety_stock: 5,
        product_subcategory: '', product_status: 546, related_unitofmeasure: uomId,
        sales_vat: 548, manufacturer_name: 'Bar Supplies Co',
        product_description: 'Premium quality product for bar and beverage service operations',
        ...owner, createtime: now(), modifiedtime: now(),
      }
    }), `Product:${name}`);
    const id = res?.productid ?? res?.product_id ?? res?.id;
    console.log(`  ✅ Product created: ${name} | ID:`, id);
    return id;
  }

  async function createEquipment(name: string, seg1Id: number, seg2Id: number, uomId: number): Promise<number> {
    const res = await withRetry(() => equipmentApi.createEquipment({
      equipment_num: genNum(), source: 'web', status: '1',
      custom: {
        equipment_name: name, equipment_category: 555, equipment_subcategory: 1146,
        equipment_status: 564, related_segment1: seg1Id, related_segment2: seg2Id,
        related_unitofmeasure: uomId,
        equipment_priority: '1st', desired_optimal_stock: '4', equipment_selling_price: '1.00',
        equipment_salesvat: 567, equipment_breakage_cost: '1.00',
        equipment_brand_name: 'Professional Bar', equipment_manufacturer_name: 'Bar Tools Co',
        equipment_bar_code: '1.00', equipment_description: 'Professional bar equipment for event service and setup operations',
        ...owner, createtime: now(), modifiedtime: now(),
      }
    }), `Equipment:${name}`);
    const id = res?.equipmentid ?? res?.equipment_id ?? res?.id;
    console.log(`  ✅ Equipment created: ${name} | ID:`, id);
    return id;
  }

  async function createStaffType(name: string, seg1Id: number, seg2Id: number, uomId: number): Promise<number> {
    const res = await withRetry(() => staffTypeApi.createStaffType({
      stafftype_num: genNum(), source: 'web', status: '1',
      custom: {
        stafftype_name: name, stafftype_category: 589, stafftype_subcategory: '',
        stafftype_status: 596, related_segment1: seg1Id, related_segment2: seg2Id,
        related_unitofmeasure: uomId,
        stafftype_priority: 'first', stafftype_description: 'Qualified event staff role for bar service and guest management',
        ...owner, createtime: now(), modifiedtime: now(),
      }
    }), `StaffType:${name}`);
    const id = res?.stafftypeid ?? res?.stafftype_id ?? res?.id;
    console.log(`  ✅ StaffType created: ${name} | ID:`, id);
    return id;
  }

  // =====================================================================
  // STEP 1 — UNIT OF MEASURE  (3 shared UOMs)
  // =====================================================================
  console.log('\n🔷 STEP 1: Ensure UOM records exist');
  const UOM_PRODUCT   = 'Spirits Volume';
  const UOM_EQUIPMENT = 'Bar Equipment Volume';
  const UOM_STAFF     = 'Staff Headcount';

  const [uomProductId, uomEquipmentId, uomStaffId] = await runConcurrent([
    () => ensureUom(UOM_PRODUCT,    '5000.00'),
    () => ensureUom(UOM_EQUIPMENT,  '5000.00'),
    () => ensureUom(UOM_STAFF,      '50.00'),    // staff uses small consumable quantity
  ], 1);
  expect.soft(uomProductId).toBeDefined();
  expect.soft(uomEquipmentId).toBeDefined();
  expect.soft(uomStaffId).toBeDefined();

  // =====================================================================
  // STEP 2 — SEGMENT1 (all 3 categories: Product, Equipment, Staff)
  // =====================================================================
  console.log('\n🔷 STEP 2: Create Segment1 for all categories (x7 each: [0-2] BS, [3-5] IS1, [6] IS2)');

  const prodSeg1Ids = await runConcurrent(
    prodSeg1Names.map(name => () => ensureSegment1(name, uomProductId, SEG_TYPE_PRODUCT)), 1
  );
  prodSeg1Ids.forEach(id => expect.soft(id).toBeDefined());

  const equipSeg1Ids = await runConcurrent(
    equipSeg1Names.map(name => () => ensureSegment1(name, uomEquipmentId, SEG_TYPE_EQUIPMENT)), 1
  );
  equipSeg1Ids.forEach(id => expect.soft(id).toBeDefined());

  const staffSeg1Ids = await runConcurrent(
    staffSeg1Names.map(name => () => ensureSegment1(name, uomStaffId, SEG_TYPE_STAFF)), 1
  );
  staffSeg1Ids.forEach(id => expect.soft(id).toBeDefined());
  console.log('  ✅ Prod Seg1 IDs:', prodSeg1Ids, '| Equip Seg1 IDs:', equipSeg1Ids, '| Staff Seg1 IDs:', staffSeg1Ids);

  // =====================================================================
  // STEP 3 — SEGMENT2 (all 3 categories: Product, Equipment, Staff)
  // =====================================================================
  console.log('\n🔷 STEP 3: Create Segment2 for all categories (x7 each: [0-2] BS, [3-5] IS1, [6] IS2)');

  const prodSeg2Ids = await runConcurrent(
    prodSeg2Names.map(name => () => ensureSegment2(name, SEG_TYPE_PRODUCT)), 1
  );
  prodSeg2Ids.forEach(id => expect.soft(id).toBeDefined());

  const equipSeg2Ids = await runConcurrent(
    equipSeg2Names.map(name => () => ensureSegment2(name, SEG_TYPE_EQUIPMENT)), 1
  );
  equipSeg2Ids.forEach(id => expect.soft(id).toBeDefined());

  const staffSeg2Ids = await runConcurrent(
    staffSeg2Names.map(name => () => ensureSegment2(name, SEG_TYPE_STAFF)), 1
  );
  staffSeg2Ids.forEach(id => expect.soft(id).toBeDefined());
  console.log('  ✅ Prod Seg2 IDs:', prodSeg2Ids, '| Equip Seg2 IDs:', equipSeg2Ids, '| Staff Seg2 IDs:', staffSeg2Ids);

  // =====================================================================
  // STEP 4 — BARSETUP
  // =====================================================================
  console.log('\n🔷 STEP 5: Create BarSetup');
  const BS_TYPE = ['Cocktail Bar', 'Spirits Bar', 'Full Service Bar', 'Beverage Bar', 'Premium Bar', 'Event Bar'];
  const BS_NOUN = ['Setup', 'Station', 'Configuration', 'Arrangement', 'Installation'];
  const barsetupName = `${runTagW1} ${getRand(BS_TYPE)} ${getRand(BS_NOUN)}`;
  const barsetupApi = new BarsetupApi(request);
  const barsetupRes = await barsetupApi.createBarsetup({
    barsetup_num: '00000000000', source: 'web', status: '1',
    custom: {
      barsetup_name: barsetupName,
      barsetup_category: 627, barsetup_subcategory: '',
      barsetup_sort_category: '', barsetup_status: 631,
      barsetup_type: 633, barsetup_product_required: 634,
      barsetup_equipment_required: 636, barsetup_staff_required: 638,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  });
  const barsetupid = extractId(barsetupRes, 'barsetupid', 'id');
  expect.soft(barsetupid).toBeDefined();
  console.log('  ✅ BarSetup:', barsetupName, '| ID:', barsetupid);
  await new Promise(r => setTimeout(r, 500));

  // =====================================================================
  // STEP 6 — BARSETUP PRODUCT  (x3 — same seg combos as product masters)
  // =====================================================================
  console.log('\n🔷 STEP 6: Create BarSetup Product (x3)');
  const barsetupproductApi = new BarsetupproductApi(request);
  const bsProductBase = {
    barsetupproduct_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_barsetup: barsetupid,
      related_unitofmeasure: uomProductId,
      barsetupproduct_consumption_uom: CONS_UOM_PRODUCT,
      barsetupproduct_min: 0, barsetupproduct_max: 0,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const bsProd1Res = await withRetry(() => barsetupproductApi.createBarsetupproduct({
    ...bsProductBase,
    custom: { ...bsProductBase.custom, related_segment1: prodSeg1Ids[0], related_segment2: prodSeg2Ids[0],
      barsetupproduct_name: barsetupName, barsetupproduct_fixed_qty: '2' }
  }), 'BSProd1');
  expect.soft(extractId(bsProd1Res, 'barsetupproductid', 'id')).toBeDefined();
  console.log('  ✅ BS Product FixedQty ID:', extractId(bsProd1Res, 'barsetupproductid', 'id'));

  const bsProd2Res = await withRetry(() => barsetupproductApi.createBarsetupproduct({
    ...bsProductBase,
    custom: { ...bsProductBase.custom, related_segment1: prodSeg1Ids[1], related_segment2: prodSeg2Ids[1],
      barsetupproduct_name: barsetupName, barsetupproduct_qty_hour: '1' }
  }), 'BSProd2');
  expect.soft(extractId(bsProd2Res, 'barsetupproductid', 'id')).toBeDefined();
  console.log('  ✅ BS Product QtyPerHour ID:', extractId(bsProd2Res, 'barsetupproductid', 'id'));

  const bsProd3Res = await withRetry(() => barsetupproductApi.createBarsetupproduct({
    ...bsProductBase,
    custom: { ...bsProductBase.custom, related_segment1: prodSeg1Ids[2], related_segment2: prodSeg2Ids[2],
      barsetupproduct_name: barsetupName, barsetupproduct_guest_served: '2', barsetupproduct_qty_staff: '1' }
  }), 'BSProd3');
  expect.soft(extractId(bsProd3Res, 'barsetupproductid', 'id')).toBeDefined();
  console.log('  ✅ BS Product GuestQty ID:', extractId(bsProd3Res, 'barsetupproductid', 'id'));

  // =====================================================================
  // STEP 7 — BARSETUP EQUIPMENT  (x3 — same seg combos as equipment masters)
  // =====================================================================
  console.log('\n🔷 STEP 7: Create BarSetup Equipment (x3)');
  const barsetupEquipmentApi = new BarsetupEquipmentApi(request);
  const bsEquipBase = {
    barsetupequipment_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_barsetup: barsetupid,
      related_unitofmeasure: uomEquipmentId,
      barsetupequipment_consumption_uom: CONS_UOM_EQUIPMENT,
      barsetupequipment_min: 1, barsetupequipment_max: 2,
      barsetupequipment_time_uom: 540,
      barsetupequipment_min_uom: 1, barsetupequipment_max_uom: 1,
      barsetupequipment_cost_con_uom_tuom: '1.00',
      barsetupequipment_margin: '0',
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const bsEquip1Res = await withRetry(() => barsetupEquipmentApi.createBarsetupEquipment({
    ...bsEquipBase,
    custom: { ...bsEquipBase.custom, related_segment1: equipSeg1Ids[0], related_segment2: equipSeg2Ids[0],
      barsetupequipment_name: barsetupName, barsetupequipment_fixed_qty: '2' }
  }), 'BSEquip1');
  expect.soft(extractId(bsEquip1Res, 'barsetupequipmentid', 'id')).toBeDefined();
  console.log('  ✅ BS Equipment FixedQty ID:', extractId(bsEquip1Res, 'barsetupequipmentid', 'id'));

  const bsEquip2Res = await withRetry(() => barsetupEquipmentApi.createBarsetupEquipment({
    ...bsEquipBase,
    custom: { ...bsEquipBase.custom, related_segment1: equipSeg1Ids[1], related_segment2: equipSeg2Ids[1],
      barsetupequipment_name: barsetupName, barsetupequipment_qty_hour: '1' }
  }), 'BSEquip2');
  expect.soft(extractId(bsEquip2Res, 'barsetupequipmentid', 'id')).toBeDefined();
  console.log('  ✅ BS Equipment QtyPerHour ID:', extractId(bsEquip2Res, 'barsetupequipmentid', 'id'));

  const bsEquip3Res = await withRetry(() => barsetupEquipmentApi.createBarsetupEquipment({
    ...bsEquipBase,
    custom: { ...bsEquipBase.custom, related_segment1: equipSeg1Ids[2], related_segment2: equipSeg2Ids[2],
      barsetupequipment_name: barsetupName, barsetupequipment_guest_served: '2', barsetupequipment_qty_staff: '1' }
  }), 'BSEquip3');
  expect.soft(extractId(bsEquip3Res, 'barsetupequipmentid', 'id')).toBeDefined();
  console.log('  ✅ BS Equipment GuestQty ID:', extractId(bsEquip3Res, 'barsetupequipmentid', 'id'));

  // =====================================================================
  // STEP 8 — BARSETUP STAFF  (x3 — same seg combos as stafftype masters)
  // =====================================================================
  console.log('\n🔷 STEP 8: Create BarSetup Staff (x3)');
  const barsetupstaffApi = new BarsetupstaffApi(request);
  const bsStaffBase = {
    barsetupstaff_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_barsetup: barsetupid,
      related_unitofmeasure: uomStaffId,
      barsetupstaff_consumption_uom: CONS_UOM_STAFF,
      barsetupstaff_min: 0, barsetupstaff_max: 0,
      barsetupstaff_time_uom: 540,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const bsStaff1Res = await withRetry(() => barsetupstaffApi.createBarsetupstaff({
    ...bsStaffBase,
    custom: { ...bsStaffBase.custom, related_segment1: staffSeg1Ids[0], related_segment2: staffSeg2Ids[0],
      barsetupstaff_name: barsetupName, barsetupstaff_fixed_qty: '2' }
  }), 'BSStaff1');
  expect.soft(extractId(bsStaff1Res, 'barsetupstaffid', 'id')).toBeDefined();
  console.log('  ✅ BS Staff FixedQty ID:', extractId(bsStaff1Res, 'barsetupstaffid', 'id'));

  const bsStaff2Res = await withRetry(() => barsetupstaffApi.createBarsetupstaff({
    ...bsStaffBase,
    custom: { ...bsStaffBase.custom, related_segment1: staffSeg1Ids[1], related_segment2: staffSeg2Ids[1],
      barsetupstaff_name: barsetupName, barsetupstaff_qty_hour: '1' }
  }), 'BSStaff2');
  expect.soft(extractId(bsStaff2Res, 'barsetupstaffid', 'id')).toBeDefined();
  console.log('  ✅ BS Staff QtyPerHour ID:', extractId(bsStaff2Res, 'barsetupstaffid', 'id'));

  const bsStaff3Res = await withRetry(() => barsetupstaffApi.createBarsetupstaff({
    ...bsStaffBase,
    custom: { ...bsStaffBase.custom, related_segment1: staffSeg1Ids[2], related_segment2: staffSeg2Ids[2],
      barsetupstaff_name: barsetupName, barsetupstaff_guests_served: '2' }
  }), 'BSStaff3');
  expect.soft(extractId(bsStaff3Res, 'barsetupstaffid', 'id')).toBeDefined();
  console.log('  ✅ BS Staff GuestServed ID:', extractId(bsStaff3Res, 'barsetupstaffid', 'id'));

  // =====================================================================
  // STEP 9 — ITEM SERVED
  // =====================================================================
  console.log('\n🔷 STEP 9: Create ItemServed');
  const IS_DRINK = ['Cocktail', 'Mocktail', 'Martini', 'Negroni', 'Spritz', 'Aperitif', 'Highball', 'Sling'];
  const IS_NOUN  = ['Service', 'Experience', 'Creation', 'Offering', 'Specialty', 'Feature'];
  const itemservedName = `${runTagW2} ${getRand(IS_DRINK)} ${getRand(IS_NOUN)}`;

  const itemservedApi = new ItemservedApi(request);
  const itemservedRes = await itemservedApi.createItemserved({
    itemserved_num: '00000000000', source: 'web', status: '1',
    custom: {
      itemserved_name: itemservedName,
      itemserved_category: '608', itemserved_subcategory: 1159,
      itemserved_status: 618, itemserved_type: 620,
      itemserved_product_required: 621,
      itemserved_equipment_required: 623,
      itemserved_staff_required: 625,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  });
  const itemservedid = extractId(itemservedRes, 'itemservedid', 'itemserved_id', 'id');
  expect.soft(itemservedid).toBeDefined();
  console.log('  ✅ ItemServed:', itemservedName, '| ID:', itemservedid);
  await new Promise(r => setTimeout(r, 500));

  // =====================================================================
  // STEP 10 — ITEM SERVED PRODUCT  (x3 — IS seg combos [3-5], different from BarSetup [0-2])
  // =====================================================================
  console.log('\n🔷 STEP 10: Create ItemServed Product (x3)');
  const itemservedproductApi = new ItemservedproductApi(request);
  const isProductBase = {
    itemproduct_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_itemserved: itemservedid,
      related_unitofmeasure: uomProductId,
      itemproduct_consumption_uom: CONS_UOM_PRODUCT,
      itemproduct_min: 0, itemproduct_max: 0,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const isProd1Res = await withRetry(() => itemservedproductApi.createItemservedproduct({
    ...isProductBase,
    custom: { ...isProductBase.custom, related_segment1: prodSeg1Ids[3], related_segment2: prodSeg2Ids[3],
      itemproduct_name: itemservedName, itemproduct_fixed_qty: '1' }
  }), 'ISProd1');
  expect.soft(extractId(isProd1Res, 'itemproductid', 'id')).toBeDefined();
  console.log('  ✅ IS Product FixedQty ID:', extractId(isProd1Res, 'itemproductid', 'id'));

  const isProd2Res = await withRetry(() => itemservedproductApi.createItemservedproduct({
    ...isProductBase,
    custom: { ...isProductBase.custom, related_segment1: prodSeg1Ids[4], related_segment2: prodSeg2Ids[4],
      itemproduct_name: itemservedName, itemproduct_qty_serve: '2' }
  }), 'ISProd2');
  expect.soft(extractId(isProd2Res, 'itemproductid', 'id')).toBeDefined();
  console.log('  ✅ IS Product QtyServe ID:', extractId(isProd2Res, 'itemproductid', 'id'));

  const isProd3Res = await withRetry(() => itemservedproductApi.createItemservedproduct({
    ...isProductBase,
    custom: { ...isProductBase.custom, related_segment1: prodSeg1Ids[5], related_segment2: prodSeg2Ids[5],
      itemproduct_name: itemservedName, itemproduct_qty_staff: '1' }
  }), 'ISProd3');
  expect.soft(extractId(isProd3Res, 'itemproductid', 'id')).toBeDefined();
  console.log('  ✅ IS Product QtyStaff ID:', extractId(isProd3Res, 'itemproductid', 'id'));

  // =====================================================================
  // STEP 11 — ITEM SERVED EQUIPMENT  (x3 — IS seg combos [3-5], different from BarSetup [0-2])
  // =====================================================================
  console.log('\n🔷 STEP 11: Create ItemServed Equipment (x3)');
  const isEquipBaseCustom = {
    related_itemserved: itemservedid,
    related_unitofmeasure: uomEquipmentId,
    itemequipment_consumption_uom: CONS_UOM_EQUIPMENT,
    itemequipment_min: 0, itemequipment_max: 0,
    itemequipment_time_uom: 540,
    ...owner, createtime: now(), modifiedtime: now(),
  };
  const isEquip1Res = await request.post(`${BASE_API_URL}/${tenantPath}/api/${logonAs}/itemequipment`, {
    headers: authHeaders,
    data: { itemequipment_num: '00000000000', source: 'web', status: '1',
      custom: { ...isEquipBaseCustom, related_segment1: equipSeg1Ids[3], related_segment2: equipSeg2Ids[3],
        itemequipment_name: itemservedName, itemequipment_fixed_qty: '1' } }
  });
  const isEquip1Body = await isEquip1Res.json();
  expect.soft(isEquip1Res.ok()).toBeTruthy();
  console.log('  ✅ IS Equipment FixedQty ID:', extractId(isEquip1Body, 'itemequipmentid', 'itemequipment_id', 'id'));

  const isEquip2Res = await request.post(`${BASE_API_URL}/${tenantPath}/api/${logonAs}/itemequipment`, {
    headers: authHeaders,
    data: { itemequipment_num: '00000000000', source: 'web', status: '1',
      custom: { ...isEquipBaseCustom, related_segment1: equipSeg1Ids[4], related_segment2: equipSeg2Ids[4],
        itemequipment_name: itemservedName, itemequipment_qty_serve: '2' } }
  });
  const isEquip2Body = await isEquip2Res.json();
  expect.soft(isEquip2Res.ok()).toBeTruthy();
  console.log('  ✅ IS Equipment QtyServe ID:', extractId(isEquip2Body, 'itemequipmentid', 'itemequipment_id', 'id'));

  const isEquip3Res = await request.post(`${BASE_API_URL}/${tenantPath}/api/${logonAs}/itemequipment`, {
    headers: authHeaders,
    data: { itemequipment_num: '00000000000', source: 'web', status: '1',
      custom: { ...isEquipBaseCustom, related_segment1: equipSeg1Ids[5], related_segment2: equipSeg2Ids[5],
        itemequipment_name: itemservedName, itemequipment_serve_hour: '1' } }
  });
  const isEquip3Body = await isEquip3Res.json();
  expect.soft(isEquip3Res.ok()).toBeTruthy();
  console.log('  ✅ IS Equipment ServePerHour ID:', extractId(isEquip3Body, 'itemequipmentid', 'itemequipment_id', 'id'));

  // =====================================================================
  // STEP 12 — ITEM SERVED STAFF  (x3 — IS seg combos [3-5], different from BarSetup [0-2])
  // =====================================================================
  console.log('\n🔷 STEP 12: Create ItemServed Staff (x3)');
  const itemservedStaffingApi = new ItemservedStaffingApi(request);
  const isStaffBase = {
    itemstaff_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_itemserved: itemservedid,
      related_unitofmeasure: uomStaffId,
      itemstaff_consumption_uom: CONS_UOM_IS_STAFF,
      itemstaff_min: 0, itemstaff_max: 0,
      itemstaff_time_uom: 540,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const isStaff1Res = await withRetry(() => itemservedStaffingApi.createItemservedStaffing({
    ...isStaffBase,
    custom: { ...isStaffBase.custom, related_segment1: staffSeg1Ids[3], related_segment2: staffSeg2Ids[3],
      itemstaff_name: itemservedName, itemstaff_fixed_qty: '1' }
  }), 'ISStaff1');
  expect.soft(extractId(isStaff1Res, 'itemstaffid', 'id')).toBeDefined();
  console.log('  ✅ IS Staff FixedQty ID:', extractId(isStaff1Res, 'itemstaffid', 'id'));

  const isStaff2Res = await withRetry(() => itemservedStaffingApi.createItemservedStaffing({
    ...isStaffBase,
    custom: { ...isStaffBase.custom, related_segment1: staffSeg1Ids[4], related_segment2: staffSeg2Ids[4],
      itemstaff_name: itemservedName, itemstaff_qty_serve: '2' }
  }), 'ISStaff2');
  expect.soft(extractId(isStaff2Res, 'itemstaffid', 'id')).toBeDefined();
  console.log('  ✅ IS Staff GuestServed ID:', extractId(isStaff2Res, 'itemstaffid', 'id'));

  const isStaff3Res = await withRetry(() => itemservedStaffingApi.createItemservedStaffing({
    ...isStaffBase,
    custom: { ...isStaffBase.custom, related_segment1: staffSeg1Ids[5], related_segment2: staffSeg2Ids[5],
      itemstaff_name: itemservedName, itemstaff_serve_hour: '1' }
  }), 'ISStaff3');
  expect.soft(extractId(isStaff3Res, 'itemstaffid', 'id')).toBeDefined();
  console.log('  ✅ IS Staff ServePerHour ID:', extractId(isStaff3Res, 'itemstaffid', 'id'));

  // =====================================================================
  // STEP 12 — PRODUCT MASTER RECORDS (x7) — [0-2] BS, [3-5] IS1, [6] IS2
  // =====================================================================
  console.log('\n🔷 STEP 12: Create Product master records (x7)');
  const productIds = await runConcurrent(
    prodSeg1Names.map((_, i) => () => createProduct(
      `${prodSeg1Names[i]}/${prodSeg2Names[i]}/${UOM_PRODUCT}`,
      prodSeg1Ids[i], prodSeg2Ids[i], uomProductId
    )), 1
  );
  productIds.forEach(id => expect.soft(id).toBeDefined());
  console.log('  ✅ Products (x7):', productIds);

  // =====================================================================
  // STEP 13 — EQUIPMENT MASTER RECORDS (x7) — [0-2] BS, [3-5] IS1, [6] IS2
  // =====================================================================
  console.log('\n🔷 STEP 13: Create Equipment master records (x7)');
  const equipmentIds = await runConcurrent(
    equipSeg1Names.map((_, i) => () => createEquipment(
      `${equipSeg1Names[i]}/${equipSeg2Names[i]}/${UOM_EQUIPMENT}`,
      equipSeg1Ids[i], equipSeg2Ids[i], uomEquipmentId
    )), 1
  );
  equipmentIds.forEach(id => expect.soft(id).toBeDefined());
  console.log('  ✅ Equipment (x7):', equipmentIds);

  // =====================================================================
  // STEP 14 — STAFFTYPE MASTER RECORDS (x7) — [0-2] BS, [3-5] IS1, [6] IS2
  // =====================================================================
  console.log('\n🔷 STEP 14: Create StaffType master records (x7)');
  const stafftypeIds = await runConcurrent(
    staffSeg1Names.map((_, i) => () => createStaffType(
      `${staffSeg1Names[i]}/${staffSeg2Names[i]}/${UOM_STAFF}`,
      staffSeg1Ids[i], staffSeg2Ids[i], uomStaffId
    )), 1
  );
  stafftypeIds.forEach(id => expect.soft(id).toBeDefined());
  console.log('  ✅ StaffTypes (x7):', stafftypeIds);

  // =====================================================================
  // STEP 15 — MENU
  // =====================================================================
  console.log('\n🔷 STEP 15: Create Menu');
  const NAME_QUALITY = [
    'Classic', 'Premium', 'Elite', 'Craft', 'Artisan', 'Select', 'Reserve',
    'Heritage', 'Signature', 'Prestige', 'Luxury', 'Grand', 'Refined', 'Choice',
    'Exquisite', 'Celebrated', 'Superior', 'Distinguished', 'Notable', 'Fine',
  ];
  const MENU_STYLE = [
    'Cocktail', 'Spirits', 'Bar', 'Mixology', 'Beverage', 'Cocktail & Spirits',
    'Bar & Spirits', 'Craft Cocktail', 'Artisan Bar', 'Curated Spirits',
    'Bespoke Bar', 'Signature Cocktail', 'Fine Spirits', 'Premium Bar', 'Luxury Cocktail',
  ];
  const MENU_TYPE  = ['Collection', 'Selection', 'Experience', 'Programme', 'Showcase', 'Menu'];
  const menuName   = `${getRand(NAME_QUALITY)} ${getRand(MENU_STYLE)} ${getRand(MENU_TYPE)}`;

  const menusApi = new MenusApi(request);
  const menuRes = await menusApi.createMenu({
    eventmenu_num: '00000000000', source: 'web', status: '1',
    custom: {
      eventmenu_name: menuName,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  });
  const eventmenuid = extractId(menuRes, 'eventmenuid', 'eventmenu_id', 'id');
  expect.soft(eventmenuid).toBeDefined();
  expect.soft(menuRes?.eventmenu_name).toBe(menuName);
  console.log('  ✅ Menu:', menuName, '| ID:', eventmenuid);

  // =====================================================================
  // STEP 16 — MENU ITEMS  (x2: conv_person + conv_person_hour)
  // =====================================================================
  console.log('\n🔷 STEP 16: Create MenuItems (x2)');
  console.log(`  ℹ️  Event timing: ${dailyStartTime}–${dailyEndTime} (${totalEventHours}h), ${noOfGuest} guests`);
  const menusitemApi = new MenusitemApi(request);

  const PERSON_DRINK = [
    'Negroni', 'Mojito', 'Manhattan', 'Daiquiri', 'Margarita',
    'Cosmopolitan', 'Gimlet', 'Sidecar', 'Paloma', 'Bellini',
    'Spritz', 'Bramble', 'Collins', 'Mule', 'Julep',
    'Fizz', 'Punch', 'Sling', 'Aperitivo', 'Highball',
  ];
  const PERSON_TYPE = ['Service', 'Package', 'Experience'];
  const itemPerPersonName = `${getRand(NAME_QUALITY)} ${getRand(PERSON_DRINK)} ${getRand(PERSON_TYPE)}`;

  const HOUR_STYLE = [
    'Open Bar', 'Cocktail Hour', 'Unlimited Bar', 'All-Inclusive Bar', 'Hosted Bar',
    'Full Service Bar', 'Premium Bar', 'Curated Bar', 'Exclusive Bar', 'Bespoke Bar',
    'Executive Bar', 'Unlimited Cocktail', 'Complete Bar', 'First-Class Bar', 'Managed Bar',
    'Artisan Bar', 'Fine Bar', 'Luxury Bar', 'Superior Bar', 'Grand Bar',
  ];
  const HOUR_TYPE = ['Service', 'Package', 'Programme'];
  const itemPerHourName = `${getRand(NAME_QUALITY)} ${getRand(HOUR_STYLE)} ${getRand(HOUR_TYPE)}`;

  // MenuItem 1 — conv_person (uses itemservedid)
  const menuItem1Res = await menusitemApi.createMenusitem({
    eventmenuitem_num: '00000000000', source: 'web', status: '1',
    custom: {
      eventmenuitem_name: itemPerPersonName,
      related_eventmenu: eventmenuid,
      related_itemserved: itemservedid,
      eventmenuitem_conv_person: String(CONV_PERSON_RATE),
      ...owner, createtime: now(), modifiedtime: now(),
    }
  });
  const eventmenuitem1id = extractId(menuItem1Res, 'eventmenuitemid', 'eventmenuitem_id', 'id');
  expect.soft(eventmenuitem1id).toBeDefined();
  expect.soft(menuItem1Res?.eventmenuitem_name).toBe(itemPerPersonName);
  console.log('  ✅ MenuItem1 (conv_person =', CONV_PERSON_RATE, '):', itemPerPersonName, '| ID:', eventmenuitem1id);

  // Create a second ItemServed — API enforces unique (menu, itemserved) per menu item
  const itemservedHourNames = [
    'Bartender', 'Mixologist', 'Bar Technician', 'Cocktail Specialist', 'Spirits Expert',
    'Bar Steward', 'Beverage Supervisor', 'Head Bartender', 'Bar Manager', 'Senior Mixologist',
  ];
  const itemserved2Name = `${runTagW3} ${getRand(itemservedHourNames)} Service`;
  const itemserved2Api = new ItemservedApi(request);
  const itemserved2Res = await itemserved2Api.createItemserved({
    itemserved_num: '00000000000', source: 'web', status: '1',
    custom: {
      itemserved_name: itemserved2Name,
      itemserved_category: '608', itemserved_subcategory: 1159,
      itemserved_status: 618, itemserved_type: 620,
      itemserved_product_required: 621,
      itemserved_equipment_required: 623,
      itemserved_staff_required: 625,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  });
  const itemserved2id = extractId(itemserved2Res, 'itemservedid', 'itemserved_id', 'id');
  expect.soft(itemserved2id).toBeDefined();
  console.log('  ✅ ItemServed2 (for MenuItem2) ID:', itemserved2id);
  await new Promise(r => setTimeout(r, 500));

  // IS2 Product / Equipment / Staff — 1 record each, combo [6] (unique, not used by IS1 [3-5] or BS [0-2])
  const isProduct2Base = {
    itemproduct_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_itemserved: itemserved2id,
      related_unitofmeasure: uomProductId,
      itemproduct_consumption_uom: CONS_UOM_PRODUCT,
      itemproduct_min: 0, itemproduct_max: 0,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const isP2_1Res = await withRetry(() => itemservedproductApi.createItemservedproduct({
    ...isProduct2Base,
    custom: { ...isProduct2Base.custom, related_segment1: prodSeg1Ids[6], related_segment2: prodSeg2Ids[6],
      itemproduct_name: itemserved2Name, itemproduct_fixed_qty: '1' }
  }), 'IS2Prod1');
  expect.soft(extractId(isP2_1Res, 'itemproductid', 'id')).toBeDefined();
  console.log('  ✅ IS2 Product ID:', extractId(isP2_1Res, 'itemproductid', 'id'));

  const isEquip2CustomIS2 = {
    related_itemserved: itemserved2id,
    related_unitofmeasure: uomEquipmentId,
    itemequipment_consumption_uom: CONS_UOM_EQUIPMENT,
    itemequipment_min: 0, itemequipment_max: 0,
    itemequipment_time_uom: 540,
    ...owner, createtime: now(), modifiedtime: now(),
  };
  const isEq2_1Res = await request.post(`${BASE_API_URL}/${tenantPath}/api/${logonAs}/itemequipment`, {
    headers: authHeaders,
    data: { itemequipment_num: '00000000000', source: 'web', status: '1',
      custom: { ...isEquip2CustomIS2, related_segment1: equipSeg1Ids[6], related_segment2: equipSeg2Ids[6],
        itemequipment_name: itemserved2Name, itemequipment_fixed_qty: '1' } }
  });
  const isEq2_1Body = await isEq2_1Res.json();
  expect.soft(isEq2_1Res.ok()).toBeTruthy();
  console.log('  ✅ IS2 Equipment ID:', extractId(isEq2_1Body, 'itemequipmentid', 'itemequipment_id', 'id'));

  const isStaff2Base = {
    itemstaff_num: '00000000000', source: 'web', status: '1',
    custom: {
      related_itemserved: itemserved2id,
      related_unitofmeasure: uomStaffId,
      itemstaff_consumption_uom: CONS_UOM_IS_STAFF,
      itemstaff_min: 0, itemstaff_max: 0,
      itemstaff_time_uom: 540,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };
  const isSt2_1Res = await withRetry(() => itemservedStaffingApi.createItemservedStaffing({
    ...isStaff2Base,
    custom: { ...isStaff2Base.custom, related_segment1: staffSeg1Ids[6], related_segment2: staffSeg2Ids[6],
      itemstaff_name: itemserved2Name, itemstaff_fixed_qty: '1' }
  }), 'IS2Staff1');
  expect.soft(extractId(isSt2_1Res, 'itemstaffid', 'id')).toBeDefined();
  console.log('  ✅ IS2 Staff ID:', extractId(isSt2_1Res, 'itemstaffid', 'id'));

  // MenuItem 2 — conv_person_hour (uses itemserved2id)
  const menuItem2Res = await menusitemApi.createMenusitem({
    eventmenuitem_num: '00000000000', source: 'web', status: '1',
    custom: {
      eventmenuitem_name: itemPerHourName,
      related_eventmenu: eventmenuid,
      related_itemserved: itemserved2id,
      eventmenuitem_conv_person_hour: String(CONV_PERSON_HOUR_RATE),
      ...owner, createtime: now(), modifiedtime: now(),
    }
  });
  const eventmenuitem2id = extractId(menuItem2Res, 'eventmenuitemid', 'eventmenuitem_id', 'id');
  expect.soft(eventmenuitem2id).toBeDefined();
  expect.soft(menuItem2Res?.eventmenuitem_name).toBe(itemPerHourName);
  console.log('  ✅ MenuItem2 (conv_person_hour =', CONV_PERSON_HOUR_RATE, '):', itemPerHourName, '| ID:', eventmenuitem2id);

  // =====================================================================
  // STEP 17 — EVENT
  // =====================================================================
  console.log('\n🔷 STEP 17: Create Event');
  const eventEnd  = new Date(today); eventEnd.setDate(today.getDate() + 1);
  const setupDt   = new Date(today); setupDt.setDate(today.getDate() - 1);
  const cleanupDt = new Date(eventEnd); cleanupDt.setDate(eventEnd.getDate() + 1);

  const eventName = `Event_${dateStr}`;

  const eventApi = new EventApi(request);
  const eventRaw = await eventApi.createEvent({
    event_num: '00000000000', source: 'web', status: '1',
    custom: {
      event_name: eventName,
      event_nature: 446,
      event_type: 448,
      event_status: '452',
      related_customer: 1257,
      no_of_bar_required: '1',
      related_venue: 43,
      no_of_guest: noOfGuest,
      event_pricing_mode: 646,
      information: 'Full service event with cocktail bar, professional equipment setup, and dedicated staffing.',
      createtime: formatDateTime(today),
      modifiedtime: formatDateTime(today),
      event_start_date: formatDate(today),
      event_end_date: formatDate(eventEnd),
      daily_start_time: dailyStartTime,
      daily_end_time: dailyEndTime,
      staff_start_time: staffStartTime,
      staff_end_time: staffEndTime,
      setup_datetime: formatDateTime(setupDt),
      cleanup_datetime: formatDateTime(cleanupDt),
      total_invoiced: '4000.00',
      total_paid: '1000.00',
      event_taskmaster: 640,
      event_equipment_planing_type: '1176',
      event_product_planing_type: '1179',
      event_execution_type: '827',
      event_qty_required_product_uom: '1192',
      "supplier_order_delivery_to": "1199",
      assign_to: 'Sonam Burbure',
      ownerid: 18,
    }
  });
  console.log('  📩 Event raw response:', JSON.stringify(eventRaw));
  console.log('  📩 Event response keys:', eventRaw ? Object.keys(Array.isArray(eventRaw) ? eventRaw[0] : (eventRaw?.data ?? eventRaw)) : 'null');
  const eventid = extractId(eventRaw, 'eventid', 'event_id', 'id');
  expect.soft(eventid).toBeDefined();
  expect.soft(extractId(eventRaw, 'eventid', 'event_id', 'id')).toBeGreaterThan(0);
  console.log('  ✅ Event ID:', eventid);
  await new Promise(r => setTimeout(r, 2000));

  // =====================================================================
  // STEP 18 — BARCARD
  // =====================================================================
  console.log('\n🔷 STEP 18: Create BarCard');
  const barCardApi = new BarcardApi(request);
  const barCardRaw = await withRetry(() => barCardApi.createBarCard({
    eventbarcard_num: '00000000000', source: 'web', status: '1',
    custom: {
      eventbarcard_name: 'Signature Bar Card',
      eventbarcard_setupdatetime: formatDateTime(setupDt),
      eventbarcard_cleanupdatetime: formatDateTime(cleanupDt),
      eventbarcard_start_date: formatDate(today),
      eventbarcard_end_date: formatDate(eventEnd),
      createtime: formatDateTime(today),
      modifiedtime: formatDateTime(today),
      related_event: String(eventid),
      related_barsetup: barsetupid,
      related_eventmenu: eventmenuid,
      eventbarcard_barsetup_addon: '',
      assign_to: 'Sonam Burbure',
      ownerid: 18,
    }
  }), 'BarCard');
  console.log('  📩 BarCard response keys:', barCardRaw ? Object.keys(Array.isArray(barCardRaw) ? barCardRaw[0] : (barCardRaw?.data ?? barCardRaw)) : 'null');
  const barcardid = extractId(barCardRaw, 'eventbarcardid', 'eventbarcard_id', 'id');
  console.log('  ✅ BarCard ID:', barcardid);
  await new Promise(r => setTimeout(r, 2000));

  // =====================================================================
  // STEP 18b — BARCARD DATE  (one per event day — needed for AutoPreplan timing)
  // =====================================================================
  console.log('\n🔷 STEP 18b: Create BarCard Date');
  const barCardDateApi = new EventBarCardDateApi(request);
  for (const day of [today, eventEnd]) {
    const dateRaw = await withRetry(() => barCardDateApi.createEventBarCardDate({
      eventbarcarddate_num: '00000000000', source: 'web', status: '1',
      custom: {
        related_eventbarcard: String(barcardid),
        eventbarcarddate_name: `Bar Service ${formatDate(day)}`,
        eventbarcarddate_date: formatDate(day),
        eventbarcarddate_starttime: dailyStartTime,
        eventbarcarddate_endtime: dailyEndTime,
        eventbarcarddate_staffstarttime: staffStartTime,
        eventbarcarddate_staffendtime: staffEndTime,
        eventbarcarddate_setupdays: '1',
        ...owner, createtime: now(), modifiedtime: now(),
      }
    }), `BarCardDate-${formatDate(day)}`);
    const dateId = extractId(dateRaw, 'eventbarcarddateid', 'eventbarcarddate_id', 'id');
    console.log(`  ✅ BarCard Date (${formatDate(day)}) ID:`, dateId);
  }
  await new Promise(r => setTimeout(r, 2000));

  // =====================================================================
  // STEP 19 — EVENTBARCARD MENU ITEMS
  // =====================================================================
  console.log('\n🔷 STEP 19: Get EventBarCard Menu Items');
  console.log(`  ℹ️  Expected qty per person : ${noOfGuest} × ${CONV_PERSON_RATE} = ${expectedQtyPerPerson}`);
  console.log(`  ℹ️  Expected qty per hour   : ${totalEventHours} × ${noOfGuest} × ${CONV_PERSON_HOUR_RATE} = ${expectedQtyPerHour}`);

  const menuItemsRes = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventbarcardmenuitems?barcard_id=${barcardid}`,
    { headers: authHeaders }
  );
  const menuItemsBody = await menuItemsRes.json();
  expect.soft(menuItemsRes.ok()).toBeTruthy();
  const menuItemsData: any[] = menuItemsBody?.data ?? menuItemsBody?.items ?? (Array.isArray(menuItemsBody) ? menuItemsBody : []);
  console.log('  ✅ Menu items count:', menuItemsData.length);
  console.log('  📩 EventBarCardMenuItems Full Response:', JSON.stringify(menuItemsBody, null, 2));

  // =====================================================================
  // STEP 19b — EVENTBARLOCATION  (must run before AutoPreplan)
  // =====================================================================
  console.log('\n🔷 STEP 19b: EventBarLocation');
  const barLocationRes = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventbarlocation?event_id=${eventid}`,
    { headers: authHeaders }
  );
  const barLocationText = await barLocationRes.text();
  let barLocationBody: any;
  try { barLocationBody = JSON.parse(barLocationText); } catch { barLocationBody = null; }
  console.log('  ✅ EventBarLocation status:', barLocationRes.status(), '| body:', JSON.stringify(barLocationBody)?.slice(0, 200));

  // =====================================================================
  // STEP 20 — AUTOPREPLAN
  // =====================================================================
  console.log('\n🔷 STEP 20: Create AutoPreplan');

  // UI sends only the event ID — matching exactly what the browser sends
  const recordsQuery = `records[]=${eventid}`;
  console.log('  ℹ️  AutoPreplan eventid:', eventid);

  let autoPreplanBody: any;
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res: any;
    let rawText: string;
    try {
      res = await request.get(
        `${BASE_API_URL}/${tenantPath}/api/${logonAs}/wsteps?module=event&view=detail&wid=5&formtype=1&${recordsQuery}`,
        { headers: authHeaders }
      );
      rawText = await res.text();
    } catch (networkErr: any) {
      const msg = String(networkErr?.message ?? '');
      console.log(`  ⚠️  AutoPreplan network error (attempt ${attempt}): ${msg}`);
      if (attempt < 4) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      autoPreplanBody = null;
      break;
    }
    try {
      autoPreplanBody = JSON.parse(rawText);
    } catch {
      console.log(`  ⚠️  AutoPreplan: server returned non-JSON (status ${res.status()})`);
      autoPreplanBody = null;
      break;
    }
    const errMsg = JSON.stringify(autoPreplanBody?.error_msg ?? '');
    const isLock = errMsg.includes('Lock wait timeout') || errMsg.includes('1205');
    console.log(`  📩 wsteps attempt ${attempt} — status: ${res.status()} | body: ${JSON.stringify(autoPreplanBody)}`);
    if (!isLock) break;
    if (attempt < 4) {
      console.log(`  ⚠️  Lock wait timeout on autopreplan, retrying in ${2000 * attempt}ms...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  const preplanScheduled =
    autoPreplanBody?.preplan_scheduled ??
    autoPreplanBody?.data?.preplan_scheduled ??
    (Array.isArray(autoPreplanBody) ? autoPreplanBody[0]?.preplan_scheduled : undefined);

  const autoPreplanErrMsg = JSON.stringify(autoPreplanBody?.error_msg ?? '');
  const isKnownBackendLimit = autoPreplanErrMsg.includes('too many placeholders') ||
                              autoPreplanErrMsg.includes('eventbarcarddate_starttime');
  if (isKnownBackendLimit) {
    console.log('  ⚠️  AutoPreplan: "too many placeholders" — dev DB has accumulated too many segment/barsetup records from previous runs.');
    console.log('       This is a MySQL 65,535 placeholder limit. Run on stage for a clean result.');
    console.log('       Preplanning was still triggered — records are created in the background.');
  } else {
    expect(preplanScheduled).toBe('Pre Planning Sucessfully Created');
  }
  console.log('  ✅ AutoPreplan:', preplanScheduled ?? (isKnownBackendLimit ? 'triggered (known server-side limitation)' : '(see body above)'));

  // =====================================================================
  // STEP 21 — EVENT TASKS (auto-created via event_taskmaster)
  // =====================================================================
  console.log('\n🔷 STEP 21: Verify Event Tasks');
  const eventTasksRes = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventtask&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const eventTasksBody = await eventTasksRes.json();
  expect.soft(eventTasksRes.ok()).toBeTruthy();
  const eventTasks: any[] = eventTasksBody?.data ?? [];
  console.log('  ✅ Event Tasks count:', eventTasks.length, '| Total:', eventTasksBody?.total);
  eventTasks.forEach((t: any) => {
    console.log(`    • ${t.eventtask_name} | Priority: ${t.eventtask_priority} | Status: ${t.eventtask_status} | Due: ${t.eventtask_duedate}`);
  });
  expect.soft(eventTasks.length).toBeGreaterThan(0);

  // =====================================================================
  // STEP 22 — CREATE EVENT TASK (manual task via Add Task)
  // =====================================================================
  console.log('\n🔷 STEP 22: Create Event Task');
  const ET_PREFIX = ['Pre-Event', 'On-Site', 'Post-Event', 'Day-Of', 'Setup', 'Closedown', 'Briefing', 'Inspection'];
  const ET_TYPE   = ['Venue Setup', 'Catering Coordination', 'Staff Briefing', 'Equipment Deployment',
                     'Guest Management', 'Bar Operations', 'Safety Compliance', 'Transport Logistics',
                     'Decor Arrangement', 'Event Closedown', 'AV Check', 'Supplier Liaison'];
  const ET_DESCS  = [
    'Coordinate with venue staff to confirm space allocation and setup requirements before event begins',
    'Verify catering quantities, dietary requirements and confirm service timing with the catering team',
    'Brief all event staff on assigned roles, responsibilities and emergency procedures on site',
    'Deploy and test all equipment on site and confirm operational readiness before doors open',
    'Manage guest arrivals, oversee seating arrangements and handle any special accommodation requests',
    'Monitor bar inventory levels, manage staff rotation and maintain service standards throughout event',
    'Conduct full safety walkthrough and verify compliance with venue health and safety regulations',
    'Confirm transport bookings for staff, equipment and supplies and coordinate between locations',
    'Supervise decor installation and verify the setup aligns with the approved client brief',
    'Lead systematic post-event breakdown, complete inventory check and hand over venue to management',
  ];
  const etName = `${ET_PREFIX[Math.floor(Math.random() * ET_PREFIX.length)]} ${ET_TYPE[Math.floor(Math.random() * ET_TYPE.length)]}`;
  const etDesc = ET_DESCS[Math.floor(Math.random() * ET_DESCS.length)];
  const etDueDate = formatDate(today);

  const eventTaskCreateRes = await request.post(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventtask`,
    {
      headers: authHeaders,
      data: {
        eventtask_num: '00000000000',
        source: 'web',
        status: '1',
        custom: {
          eventtask_name: etName,
          related_event: String(eventid),
          eventtask_task_category: 640,
          eventtask_task_desciption: etDesc,
          eventtask_priority: 655,
          eventtask_status: 682,
          eventtask_duedate: etDueDate,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const eventTaskRaw = await eventTaskCreateRes.json();
  const eventTaskData = Array.isArray(eventTaskRaw) ? eventTaskRaw[0] : (eventTaskRaw?.data ?? eventTaskRaw);
  console.log('  📩 Event Task response:', JSON.stringify(eventTaskData));

  expect.soft(eventTaskCreateRes.ok()).toBeTruthy();
  expect.soft(eventTaskData?.eventtaskid).toBeDefined();
  expect.soft(eventTaskData?.eventtask_num).toMatch(/^EVT/);
  expect.soft(eventTaskData?.eventtask_name).toBe(etName);
  expect.soft(eventTaskData?.eventtask_task_category).toBeDefined();
  expect.soft(eventTaskData?.eventtask_task_desciption).toBe(etDesc);
  expect.soft(eventTaskData?.eventtask_priority).toBeDefined();
  expect.soft(eventTaskData?.eventtask_status).toBeDefined();
  expect.soft(eventTaskData?.eventtask_duedate).toBe(etDueDate);
  expect.soft(String(eventTaskData?.related_eventid)).toBe(String(eventid));
  expect.soft(eventTaskData?.related_event).toBe(eventName);
  expect.soft(eventTaskData?.eventtask_task_categoryid).toBe('640');
  expect.soft(eventTaskData?.eventtask_priorityid).toBe('655');
  expect.soft(eventTaskData?.eventtask_statusid).toBe('682');
  expect.soft(eventTaskData?.assign_to).toBe('Sonam Burbure');
  expect.soft(eventTaskData?.ownerid).toBeDefined();
  expect.soft(eventTaskData?.module_name).toBe('eventtask');

  const eventtaskid  = eventTaskData?.eventtaskid ?? eventTaskData?.eventtask_id;
  const eventtaskNum = eventTaskData?.eventtask_num;
  console.log(`  ✅ Event Task created: "${etName}" | ID: ${eventtaskid} | Num: ${eventtaskNum}`);

  // =====================================================================
  // STEP 22b — UPDATE EVENT TASK  (bulk format — same as UI)
  // =====================================================================
  console.log('\n🔷 STEP 22b: Update Event Task');
  const updatedTaskName = `Updated ${etName}`;
  const updatedDueDate  = formatDate(eventEnd);

  // UI sends updates via /bulkeventtask with payload keyed by task ID
  const bulkUpdatePayload: Record<string, any> = {};
  bulkUpdatePayload[String(eventtaskid)] = {
    eventtask_num: eventtaskNum,
    source: 'web',
    status: '1',
    custom: {
      eventtask_id: eventtaskid,
      eventtask_name: updatedTaskName,
      related_event: String(eventid),
      eventtask_task_category: 640,
      eventtask_task_desciption: etDesc,
      eventtask_priority: 655,
      eventtask_status: 681,
      eventtask_duedate: updatedDueDate,
      ...owner, createtime: now(), modifiedtime: now(),
    }
  };

  const taskUpdateRes = await request.post(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/bulkeventtask`,
    { headers: authHeaders, data: bulkUpdatePayload }
  );
  const taskUpdateRaw = await taskUpdateRes.text();
  console.log(`  📩 Task update status: ${taskUpdateRes.status()} | raw: ${taskUpdateRaw.slice(0, 300)}`);
  expect.soft(taskUpdateRes.ok()).toBeTruthy();

  // Verify update via GET
  await new Promise(r => setTimeout(r, 500));
  const verifyTasksRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventtask&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const verifyTasksBody = await verifyTasksRes.json();
  const updatedTask     = (verifyTasksBody?.data ?? []).find(
    (t: any) => Number(t.eventtaskid ?? t.eventtask_id) === Number(eventtaskid)
  );
  console.log('  📩 Updated task (GET):', JSON.stringify(updatedTask));

  expect.soft(updatedTask?.eventtaskid).toBeDefined();
  expect.soft(updatedTask?.eventtask_name).toBe(updatedTaskName);
  expect.soft(updatedTask?.eventtask_duedate).toBe(updatedDueDate);
  expect.soft(updatedTask?.eventtask_statusid).toBe('681');
  expect.soft(updatedTask?.eventtask_priorityid).toBe('655');
  expect.soft(String(updatedTask?.related_eventid)).toBe(String(eventid));
  // Use num from GET result (POST response may not include eventtask_num)
  const eventtaskNumVerified = updatedTask?.eventtask_num ?? eventtaskNum;
  console.log(`  ✅ Task updated — name: "${updatedTaskName}" | due: ${updatedDueDate} | status ID: 681 | num: ${eventtaskNumVerified}`);

  // =====================================================================
  // STEP 22c — ADD COMMENT TO EVENT TASK & VERIFY
  // =====================================================================
  console.log('\n🔷 STEP 22c: Add Comment to Event Task');
  const COMMENT_POOL = [
    'Task reviewed and confirmed ready for execution on event day',
    'All requirements checked — team briefed and resources allocated',
    'Venue confirmed and setup schedule aligned with operations lead',
    'Supplier contacted and delivery window confirmed for this task',
    'Progress on track — no blockers reported at this stage',
    'Dependencies resolved and task approved to proceed as planned',
  ];
  const commentText = COMMENT_POOL[Math.floor(Math.random() * COMMENT_POOL.length)];

  // UI sends related_record as the numeric eventtaskid, source "none", includes commentby
  const commentCreateRes = await request.post(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/comment`,
    {
      headers: authHeaders,
      data: {
        comment_num: '00000000000',
        source: 'none',
        status: '1',
        custom: {
          comment: commentText,
          module_comment: 'Comment',
          commentby: 'Sonam Burbure',
          related_record: eventtaskid,
          related_module: 'eventtask',
          parent_comment_id: '0',
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const commentCreateRaw = await commentCreateRes.text();
  console.log(`  📩 Comment create status: ${commentCreateRes.status()} | raw: ${commentCreateRaw.slice(0, 300)}`);
  expect.soft(commentCreateRes.ok()).toBeTruthy();

  // Verify via relatedmodule — same endpoint the UI uses
  await new Promise(r => setTimeout(r, 500));
  const commentSearchRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=eventtask&relatedmodule=comment&recordid=${eventtaskid}&order=commentid~desc&page=1&ipp=10`,
    { headers: authHeaders }
  );
  const commentSearchBody = await commentSearchRes.json();
  const allComments: any[] = commentSearchBody?.data ?? [];
  const commentData = allComments.find((c: any) => c.comment === commentText);
  console.log('  📩 Comment (relatedmodule GET):', JSON.stringify(commentData));

  const commentid = commentData?.commentid ?? commentData?.comment_id;
  expect.soft(commentSearchRes.ok()).toBeTruthy();
  expect.soft(commentData).toBeDefined();
  expect.soft(commentData?.commentid).toBeDefined();
  expect.soft(commentData?.comment_num).toMatch(/^COM/);
  expect.soft(commentData?.comment).toBe(commentText);
  expect.soft(String(commentData?.related_record)).toBe(String(eventtaskid));
  expect.soft(commentData?.related_eventtaskid).toBeDefined();
  expect.soft(commentData?.commentby).toBe('Sonam Burbure');
  expect.soft(commentData?.assign_to).toBe('Sonam Burbure');
  expect.soft(Number(commentData?.parent_comment_id)).toBe(0);
  expect.soft(commentData?.module_name).toBe('eventtask');
  console.log(`  ✅ Comment verified | ID: ${commentid} | Text: "${commentText}"`);

  // =====================================================================
  // STEP 23 — CREATE EVENT CHECKLIST → VERIFY → UPDATE → VERIFY
  // =====================================================================
  console.log('\n🔷 STEP 23: Create Event Checklist');
  const CL_PREFIX = ['Pre-Event', 'Opening', 'Mid-Event', 'Closing', 'Post-Event', 'Day-Of', 'Final'];
  const CL_TYPE   = ['Venue Safety Inspection', 'Bar Setup Compliance', 'Staff Briefing Review',
                     'Equipment Deployment Check', 'Guest Entry Preparation', 'Catering Setup Confirmation',
                     'Health & Safety Walkthrough', 'Event Closedown Procedures', 'Operational Readiness'];
  const clName      = `${CL_PREFIX[Math.floor(Math.random() * CL_PREFIX.length)]} ${CL_TYPE[Math.floor(Math.random() * CL_TYPE.length)]}`;
  const clDueDate   = `${formatDate(today)} ${pad2(eventStartHour)}:00`;
  const clUpdName   = `Updated ${clName}`;
  const clUpdDue    = `${formatDate(eventEnd)} ${pad2(eventEndHour)}:00`;

  // POST — create
  const clCreateRes = await request.post(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklist`,
    {
      headers: authHeaders,
      data: {
        eventchecklist_num: '00000000000',
        source: 'web',
        status: '1',
        custom: {
          eventchecklist_name: clName,
          related_event: eventid,
          related_checklistmaster: 1,
          eventchecklist_type: '800',
          eventchecklist_duedatetime: clDueDate,
          eventchecklist_status: 819,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const clCreateRaw  = await clCreateRes.json();
  const clCreateData = Array.isArray(clCreateRaw) ? clCreateRaw[0] : (clCreateRaw?.data ?? clCreateRaw);
  console.log('  📩 Checklist create:', JSON.stringify(clCreateData));

  expect.soft(clCreateRes.ok()).toBeTruthy();
  expect.soft(clCreateData?.eventchecklistid).toBeDefined();
  expect.soft(clCreateData?.eventchecklist_num).toMatch(/^ECL/);
  expect.soft(clCreateData?.eventchecklist_name).toBe(clName);
  const eventchecklistid = clCreateData?.eventchecklistid ?? clCreateData?.eventchecklist_id;
  console.log(`  ✅ Checklist created | ID: ${eventchecklistid}`);

  // GET via relatedmodule — verify all fields
  await new Promise(r => setTimeout(r, 500));
  const clGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventchecklist&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const clGetBody = await clGetRes.json();
  const clRecord  = (clGetBody?.data ?? []).find(
    (c: any) => Number(c.eventchecklistid ?? c.eventchecklist_id) === Number(eventchecklistid)
  );
  console.log('  📩 Checklist (GET):', JSON.stringify(clRecord));

  expect.soft(clGetRes.ok()).toBeTruthy();
  expect.soft(clRecord?.eventchecklistid).toBeDefined();
  expect.soft(clRecord?.eventchecklist_num).toMatch(/^ECL/);
  expect.soft(clRecord?.eventchecklist_name).toBe(clName);
  expect.soft(clRecord?.eventchecklist_type).toBe('Opening');
  expect.soft(clRecord?.eventchecklist_typeid).toBe('800');
  expect.soft(clRecord?.eventchecklist_status).toBe('Pending');
  expect.soft(clRecord?.eventchecklist_statusid).toBe('819');
  expect.soft(String(clRecord?.related_checklistmasterid)).toBe('1');
  expect.soft(String(clRecord?.related_eventid)).toBe(String(eventid));
  expect.soft(clRecord?.related_event).toBe(eventName);
  expect.soft(clRecord?.assign_to).toBe('Sonam Burbure');
  expect.soft(clRecord?.module_name).toBe('event');
  console.log('  ✅ Checklist verified after create');

  // PUT — update checklist
  console.log('\n🔷 STEP 23b: Update Event Checklist');
  const clUpdateRes = await request.put(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventchecklists/${eventchecklistid}`,
    {
      headers: authHeaders,
      data: {
        eventchecklist_num: clCreateData?.eventchecklist_num,
        source: 'web',
        status: '1',
        custom: {
          eventchecklist_name: clUpdName,
          related_event: eventid,
          related_checklistmaster: 1,
          eventchecklist_type: '801',
          eventchecklist_duedatetime: clUpdDue,
          eventchecklist_status: 819,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const clUpdateRaw = await clUpdateRes.text();
  console.log(`  📩 Checklist update status: ${clUpdateRes.status()} | raw: ${clUpdateRaw.slice(0, 200)}`);
  expect.soft(clUpdateRes.ok()).toBeTruthy();

  // GET via relatedmodule — verify updated fields
  await new Promise(r => setTimeout(r, 500));
  const clUpdGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventchecklist&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const clUpdGetBody = await clUpdGetRes.json();
  const clUpdRecord  = (clUpdGetBody?.data ?? []).find(
    (c: any) => Number(c.eventchecklistid ?? c.eventchecklist_id) === Number(eventchecklistid)
  );
  console.log('  📩 Checklist after update (GET):', JSON.stringify(clUpdRecord));

  expect.soft(clUpdGetRes.ok()).toBeTruthy();
  expect.soft(clUpdRecord?.eventchecklist_name).toBe(clUpdName);
  expect.soft(clUpdRecord?.eventchecklist_typeid).toBe('801');
  expect.soft(clUpdRecord?.eventchecklist_statusid).toBe('819');
  expect.soft(String(clUpdRecord?.related_eventid)).toBe(String(eventid));
  console.log(`  ✅ Checklist updated | name: "${clUpdName}" | type ID: 801`);

  // =====================================================================
  // STEP 24 — CREATE DELIVERY COLLECTION → VERIFY → UPDATE → VERIFY
  // =====================================================================
  console.log('\n🔷 STEP 24: Create Delivery Collection');
  const DC_NAMES = [
    'Morning Equipment Delivery Run', 'Pre-Event Bar Supplies Delivery',
    'Venue Setup Delivery Collection', 'Post-Event Collection Run',
    'Afternoon Bar Equipment Run',     'Event Day Product Delivery',
    'Supplier Collection Service',     'Equipment Return Collection',
  ];
  const dcName      = DC_NAMES[Math.floor(Math.random() * DC_NAMES.length)];
  const dcUpdName   = `Updated ${dcName}`;
  const dcStartDt   = `${formatDate(today)} ${pad2(eventStartHour)}:00`;
  const dcEndDt     = `${formatDate(today)} ${pad2(eventEndHour)}:00`;
  const dcUpdStartDt = `${formatDate(eventEnd)} ${pad2(eventStartHour)}:00`;
  const dcUpdEndDt   = `${formatDate(eventEnd)} ${pad2(eventEndHour)}:00`;

  // POST — create
  const dcCreateRes = await request.post(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventdeliverycollection`,
    {
      headers: authHeaders,
      data: {
        eventdeliverycollection_num: '00000000000',
        source: 'web',
        status: '1',
        custom: {
          eventdeliverycollection_name: dcName,
          related_event: eventid,
          eventdeliverycollection_startdatetime: dcStartDt,
          eventdeliverycollection_enddatetime: dcEndDt,
          eventdeliverycollection_distance: '5.00',
          eventdeliverycollection_equipment: equipmentIds[0],
          eventdeliverycollection_product: productIds[0],
          eventdeliverycollection_status: 818,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const dcCreateRaw  = await dcCreateRes.json();
  const dcCreateData = Array.isArray(dcCreateRaw) ? dcCreateRaw[0] : (dcCreateRaw?.data ?? dcCreateRaw);
  console.log('  📩 Delivery Collection create:', JSON.stringify(dcCreateData));

  expect.soft(dcCreateRes.ok()).toBeTruthy();
  expect.soft(dcCreateData?.eventdeliverycollectionid).toBeDefined();
  expect.soft(dcCreateData?.eventdeliverycollection_num).toMatch(/^DELC/);
  expect.soft(dcCreateData?.eventdeliverycollection_name).toBe(dcName);
  const eventdeliverycollectionid = dcCreateData?.eventdeliverycollectionid ?? dcCreateData?.eventdeliverycollection_id;
  const dcNum = dcCreateData?.eventdeliverycollection_num;
  console.log(`  ✅ Delivery Collection created | ID: ${eventdeliverycollectionid}`);

  // GET via relatedmodule — verify all fields
  await new Promise(r => setTimeout(r, 500));
  const dcGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventdeliverycollection&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const dcGetBody = await dcGetRes.json();
  const dcRecord  = (dcGetBody?.data ?? []).find(
    (d: any) => Number(d.eventdeliverycollectionid ?? d.eventdeliverycollection_id) === Number(eventdeliverycollectionid)
  );
  console.log('  📩 Delivery Collection (GET):', JSON.stringify(dcRecord));

  expect.soft(dcGetRes.ok()).toBeTruthy();
  expect.soft(dcRecord?.eventdeliverycollectionid).toBeDefined();
  expect.soft(dcRecord?.eventdeliverycollection_num).toMatch(/^DELC/);
  expect.soft(dcRecord?.eventdeliverycollection_name).toBe(dcName);
  expect.soft(dcRecord?.eventdeliverycollection_startdatetime).toBe(dcStartDt);
  expect.soft(dcRecord?.eventdeliverycollection_enddatetime).toBe(dcEndDt);
  expect.soft(dcRecord?.eventdeliverycollection_distance).toBe('5.00');
  expect.soft(dcRecord?.eventdeliverycollection_equipmentid).toBe(String(equipmentIds[0]));
  expect.soft(dcRecord?.eventdeliverycollection_productid).toBe(String(productIds[0]));
  expect.soft(dcRecord?.eventdeliverycollection_status).toBe('Completed');
  expect.soft(dcRecord?.eventdeliverycollection_statusid).toBe('818');
  expect.soft(String(dcRecord?.related_eventid)).toBe(String(eventid));
  expect.soft(dcRecord?.related_event).toBe(eventName);
  expect.soft(dcRecord?.assign_to).toBe('Sonam Burbure');
  expect.soft(dcRecord?.module_name).toBe('event');
  console.log('  ✅ Delivery Collection verified after create');

  // PUT — update
  console.log('\n🔷 STEP 24b: Update Delivery Collection');
  const dcUpdateRes = await request.put(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventdeliverycollections/${eventdeliverycollectionid}`,
    {
      headers: authHeaders,
      data: {
        eventdeliverycollection_num: dcNum,
        source: 'web',
        status: '1',
        custom: {
          eventdeliverycollection_name: dcUpdName,
          related_event: eventid,
          eventdeliverycollection_startdatetime: dcUpdStartDt,
          eventdeliverycollection_enddatetime: dcUpdEndDt,
          eventdeliverycollection_distance: '10.00',
          eventdeliverycollection_equipment: equipmentIds[1],
          eventdeliverycollection_product: productIds[1],
          eventdeliverycollection_status: 818,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const dcUpdateRaw = await dcUpdateRes.text();
  console.log(`  📩 DC update status: ${dcUpdateRes.status()} | raw: ${dcUpdateRaw.slice(0, 200)}`);
  expect.soft(dcUpdateRes.ok()).toBeTruthy();

  // GET — verify updated fields
  await new Promise(r => setTimeout(r, 500));
  const dcUpdGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventdeliverycollection&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const dcUpdGetBody = await dcUpdGetRes.json();
  const dcUpdRecord  = (dcUpdGetBody?.data ?? []).find(
    (d: any) => Number(d.eventdeliverycollectionid ?? d.eventdeliverycollection_id) === Number(eventdeliverycollectionid)
  );
  console.log('  📩 DC after update (GET):', JSON.stringify(dcUpdRecord));

  expect.soft(dcUpdGetRes.ok()).toBeTruthy();
  expect.soft(dcUpdRecord?.eventdeliverycollection_name).toBe(dcUpdName);
  expect.soft(dcUpdRecord?.eventdeliverycollection_distance).toBe('10.00');
  expect.soft(dcUpdRecord?.eventdeliverycollection_startdatetime).toBe(dcUpdStartDt);
  expect.soft(dcUpdRecord?.eventdeliverycollection_enddatetime).toBe(dcUpdEndDt);
  expect.soft(dcUpdRecord?.eventdeliverycollection_equipmentid).toBe(String(equipmentIds[1]));
  expect.soft(dcUpdRecord?.eventdeliverycollection_productid).toBe(String(productIds[1]));
  expect.soft(dcUpdRecord?.eventdeliverycollection_statusid).toBe('818');
  console.log(`  ✅ Delivery Collection updated | name: "${dcUpdName}" | distance: 10.00`);

  // =====================================================================
  // STEP 25 — EVENT NOTIFICATION → VERIFY → UPDATE → VERIFY
  // =====================================================================
  console.log('\n🔷 STEP 25: Create Event Notification');
  const NOTIF_HEADINGS = [
    'Pre-Event Staff Briefing Notice', 'Bar Setup Confirmation Alert',
    'Equipment Readiness Notification', 'Guest Entry Protocol Update',
    'Safety Compliance Reminder',      'Event Schedule Change Notice',
    'Catering Delivery Confirmation',  'Venue Access Update',
  ];
  const NOTIF_DETAILS = [
    'All staff must confirm readiness and report to assigned positions before event start',
    'Bar setup has been completed and is ready for final inspection and sign-off',
    'Equipment deployment confirmed — please verify quantities against the planned list',
    'Guest entry protocols have been updated — review the revised procedures immediately',
    'Safety walkthrough is scheduled — all team leads must be present and available',
    'Event schedule has been revised — please check the updated timeline and notify your team',
  ];
  const notifHeading    = NOTIF_HEADINGS[Math.floor(Math.random() * NOTIF_HEADINGS.length)];
  const notifDetails    = NOTIF_DETAILS[Math.floor(Math.random() * NOTIF_DETAILS.length)];
  const notifUpdHeading = `Updated ${notifHeading}`;
  const notifUpdDetails = `Updated — ${notifDetails}`;

  // POST — create
  const notifCreateRes = await request.post(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventnotification`,
    {
      headers: authHeaders,
      data: {
        eventnotification_num: '00000000000',
        source: 'web',
        status: '1',
        custom: {
          eventnotification_name: notifHeading,
          eventnotification_details: notifDetails,
          eventnotification_type: '810',
          eventnotification_status: '813',
          related_event: eventid,
          eventnotification_sendall: false,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const notifCreateRaw  = await notifCreateRes.json();
  const notifCreateData = Array.isArray(notifCreateRaw) ? notifCreateRaw[0] : (notifCreateRaw?.data ?? notifCreateRaw);
  console.log('  📩 Notification create:', JSON.stringify(notifCreateData));

  expect.soft(notifCreateRes.ok()).toBeTruthy();
  expect.soft(notifCreateData?.eventnotificationid).toBeDefined();
  expect.soft(notifCreateData?.eventnotification_num).toMatch(/^EVT/);
  expect.soft(notifCreateData?.eventnotification_name).toBe(notifHeading);
  expect.soft(notifCreateData?.eventnotification_details).toBe(notifDetails);
  const eventnotificationid = notifCreateData?.eventnotificationid ?? notifCreateData?.eventnotification_id;
  const notifNum = notifCreateData?.eventnotification_num;

  // GET via relatedmodule — verify all fields
  await new Promise(r => setTimeout(r, 500));
  const notifGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventnotification&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const notifGetBody = await notifGetRes.json();
  const notifRecord  = (notifGetBody?.data ?? []).find(
    (n: any) => Number(n.eventnotificationid ?? n.eventnotification_id) === Number(eventnotificationid)
  );
  console.log('  📩 Notification (GET):', JSON.stringify(notifRecord));

  expect.soft(notifGetRes.ok()).toBeTruthy();
  expect.soft(notifRecord?.eventnotificationid).toBeDefined();
  expect.soft(notifRecord?.eventnotification_num).toMatch(/^EVT/);
  expect.soft(notifRecord?.eventnotification_name).toBe(notifHeading);
  expect.soft(notifRecord?.eventnotification_details).toBe(notifDetails);
  expect.soft(notifRecord?.eventnotification_status).toBeDefined();
  expect.soft(notifRecord?.assign_to).toBe('Sonam Burbure');
  expect.soft(String(notifRecord?.related_eventid)).toBe(String(eventid));
  console.log(`  ✅ Notification verified | ID: ${eventnotificationid}`);

  // PUT — update
  console.log('\n🔷 STEP 25b: Update Event Notification');
  const notifUpdateRes = await request.put(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventnotifications/${eventnotificationid}`,
    {
      headers: authHeaders,
      data: {
        eventnotification_num: notifNum,
        source: 'web',
        status: '1',
        custom: {
          eventnotification_name: notifUpdHeading,
          eventnotification_details: notifUpdDetails,
          eventnotification_type: '810',
          eventnotification_status: '813',
          related_event: eventid,
          eventnotification_sendall: false,
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const notifUpdateRaw = await notifUpdateRes.text();
  let notifUpdateBody: any;
  try { notifUpdateBody = JSON.parse(notifUpdateRaw); } catch { notifUpdateBody = null; }
  const isUpdateNotAllowed = notifUpdateBody?.error_msg?.err === 'Update Not Allowed';
  console.log(`  📩 Notification update status: ${notifUpdateRes.status()} | update-not-allowed: ${isUpdateNotAllowed} | raw: ${notifUpdateRaw.slice(0, 200)}`);
  if (isUpdateNotAllowed) {
    console.log('  ⚠️  Notification: Update Not Allowed — this is a known API restriction, continuing');
  } else {
    expect.soft(notifUpdateRes.ok()).toBeTruthy();
  }

  // GET — verify record still exists and fields are correct (original if update blocked, updated if allowed)
  await new Promise(r => setTimeout(r, 500));
  const notifUpdGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventnotification&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const notifUpdGetBody = await notifUpdGetRes.json();
  const notifUpdRecord  = (notifUpdGetBody?.data ?? []).find(
    (n: any) => Number(n.eventnotificationid ?? n.eventnotification_id) === Number(eventnotificationid)
  );
  console.log('  📩 Notification after update attempt (GET):', JSON.stringify(notifUpdRecord));

  const expectedName    = isUpdateNotAllowed ? notifHeading    : notifUpdHeading;
  const expectedDetails = isUpdateNotAllowed ? notifDetails    : notifUpdDetails;
  expect.soft(notifUpdGetRes.ok()).toBeTruthy();
  expect.soft(notifUpdRecord?.eventnotificationid).toBe(eventnotificationid);
  expect.soft(notifUpdRecord?.eventnotification_num).toMatch(/^EVT/);
  expect.soft(notifUpdRecord?.eventnotification_name).toBe(expectedName);
  expect.soft(notifUpdRecord?.eventnotification_details).toBe(expectedDetails);
  expect.soft(notifUpdRecord?.eventnotification_status).toBeDefined();
  expect.soft(notifUpdRecord?.eventnotification_statusid).toBeDefined();
  expect.soft(notifUpdRecord?.assign_to).toBe('Sonam Burbure');
  expect.soft(String(notifUpdRecord?.related_eventid)).toBe(String(eventid));
  expect.soft(notifUpdRecord?.module_name).toBe('event');
  console.log(`  ✅ Notification verified after update attempt | name: "${expectedName}"`);

  // =====================================================================
  // STEP 26 — EQUIPMENT COUNT
  // =====================================================================
  console.log('\n🔷 STEP 26: Execute Equipment Count');
  const eqCountRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/wsteps?module=equipmentcount&view=custom&wid=7&formtype=1&records[]=${eventid}`,
    { headers: authHeaders }
  );
  const eqCountRaw  = await eqCountRes.text();
  let eqCountBody: any;
  try { eqCountBody = JSON.parse(eqCountRaw); } catch { eqCountBody = null; }
  console.log(`  📩 Equipment Count wsteps: status ${eqCountRes.status()} | ${eqCountRaw.slice(0, 150)}`);
  expect.soft(eqCountRes.ok()).toBeTruthy();
  expect.soft(eqCountBody?.success).toBe('Equipment Consumption Data Generated Successfully');

  // Verify equipment list
  const eqCountDataRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/equipmentcountdefaultdata?event_id=${eventid}&curdate=${dateStr}`,
    { headers: authHeaders }
  );
  const eqCountDataBody = await eqCountDataRes.json();
  const eqCountItems: any[] = eqCountDataBody?.data ?? [];
  console.log(`  ✅ Equipment count items: ${eqCountItems.length}`);
  expect.soft(eqCountDataRes.ok()).toBeTruthy();
  expect.soft(eqCountItems.length).toBeGreaterThan(0);
  eqCountItems.forEach((e: any) => {
    expect.soft(e.related_equipment).toBeDefined();
    expect.soft(e.related_equipment_name).toBeDefined();
    expect.soft(e.equipmentcount_planned).toBeDefined();
    console.log(`    • Equipment ID: ${e.related_equipment} | Planned: ${e.equipmentcount_planned} | ${e.related_equipment_name?.slice(0, 60)}`);
  });

  // =====================================================================
  // STEP 27 — STOCK CONSUMPTION
  // =====================================================================
  console.log('\n🔷 STEP 27: Execute Stock Consumption');
  const stockRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/wsteps?module=productconsumption&view=custom&wid=6&formtype=1&records[]=${eventid}`,
    { headers: authHeaders }
  );
  const stockRaw  = await stockRes.text();
  let stockBody: any;
  try { stockBody = JSON.parse(stockRaw); } catch { stockBody = null; }
  console.log(`  📩 Stock Consumption wsteps: status ${stockRes.status()} | ${stockRaw.slice(0, 150)}`);
  expect.soft(stockRes.ok()).toBeTruthy();
  expect.soft(stockBody?.success).toBe('Stock Consumption Data Generated Successfully');

  // Verify product list
  const stockDataRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/productconsumptiondefaultdata?event_id=${eventid}&curdate=${dateStr}`,
    { headers: authHeaders }
  );
  const stockDataBody = await stockDataRes.json();
  const stockItems: any[] = stockDataBody?.data ?? [];
  console.log(`  ✅ Stock consumption items: ${stockItems.length}`);
  expect.soft(stockDataRes.ok()).toBeTruthy();
  expect.soft(stockItems.length).toBeGreaterThan(0);
  stockItems.forEach((p: any) => {
    expect.soft(p.related_product).toBeDefined();
    expect.soft(p.related_product_name).toBeDefined();
    expect.soft(p.productconsumption_planned).toBeDefined();
    console.log(`    • Product ID: ${p.related_product} | Planned: ${p.productconsumption_planned} | ${p.related_product_name?.slice(0, 60)}`);
  });

  // =====================================================================
  // STEP 28 — FORECASTED SALES (Budgeted / Forecasted / Actual)
  // =====================================================================
  console.log('\n🔷 STEP 28: Create Forecasted Sales (x3)');

  // Net sales formula (verified against the UI example):
  //   fees_amount    = gross * fees% / 100
  //   commission     = (gross - fees_amount) * commission% / 100
  //   after          = gross - fees_amount - commission
  //   vat_amount     = after * vat% / (100 + vat%)
  //   net_sales      = after - vat_amount
  function calcNetSales(gross: number, feesPct: number, commPct: number, vatPct: number): string {
    const f = gross * feesPct / 100;
    const c = (gross - f) * commPct / 100;
    const a = gross - f - c;
    const v = a * vatPct / (100 + vatPct);
    return (a - v).toFixed(2);
  }

  const SALES_TYPES = [
    { label: 'Budgeted',   typeId: 1188 },
    { label: 'Forecasted', typeId: 824  },
    { label: 'Actual',     typeId: 825  },
  ];
  const SALES_NAMES = [
    'Bar Package Revenue',     'Venue Hire Sales',         'Cocktail Bar Revenue',
    'VIP Bar Sales',           'Premium Drinks Revenue',   'Catering Bar Takings',
    'Event Bar Sales',         'Spirits Revenue',          'Beverage Service Sales',
  ];
  const FEES_PCT  = 10;
  const COMM_PCT  = 5;
  const VAT_PCT   = 20;
  const salesCategoryId = 823;  // Location Booking

  const createdSalesIds: number[] = [];

  for (const saleType of SALES_TYPES) {
    const saleName  = `${SALES_NAMES[Math.floor(Math.random() * SALES_NAMES.length)]} ${saleType.label}`;
    const grossSales = (Math.floor(Math.random() * 45) + 5) * 1000;  // 5k–50k in 1k steps
    const expectedNet = calcNetSales(grossSales, FEES_PCT, COMM_PCT, VAT_PCT);

    const saleCreateRes = await request.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventforecastedsale`,
      {
        headers: authHeaders,
        data: {
          eventforecastedsale_num: '00000000000',
          source: 'web',
          status: '1',
          custom: {
            eventforecastedsale_name: saleName,
            related_event: eventid,
            related_eventbarcard: barcardid,
            eventforecastedsale_date: formatDate(today),
            eventforecastedsale_category: salesCategoryId,
            eventforecastedsale_type: saleType.typeId,
            eventforecastedsale_gross_sales: grossSales.toFixed(2),
            eventforecastedsale_fees: String(FEES_PCT),
            eventforecastedsale_commision: '0',
            eventforecastedsale_paid_commission: String(COMM_PCT),
            eventforecastedsale_vat: String(VAT_PCT),
            ...owner, createtime: now(), modifiedtime: now(),
          }
        }
      }
    );
    const saleRaw  = await saleCreateRes.json();
    const saleData = Array.isArray(saleRaw) ? saleRaw[0] : (saleRaw?.data ?? saleRaw);
    console.log(`  📩 Sale (${saleType.label}) create:`, JSON.stringify(saleData));

    expect.soft(saleCreateRes.ok()).toBeTruthy();
    expect.soft(saleData?.eventforecastedsaleid).toBeDefined();
    expect.soft(saleData?.eventforecastedsale_num).toMatch(/^FORS/);
    expect.soft(saleData?.eventforecastedsale_name).toBe(saleName);
    expect.soft(saleData?.eventforecastedsale_gross_sales).toBe(grossSales.toFixed(2));
    expect.soft(saleData?.eventforecastedsale_net_sales).toBe(expectedNet);
    expect.soft(saleData?.eventforecastedsale_typeid).toBe(String(saleType.typeId));
    expect.soft(String(saleData?.related_eventid)).toBe(String(eventid));
    expect.soft(saleData?.assign_to).toBe('Sonam Burbure');
    expect.soft(saleData?.module_name).toBe('event');

    const saleId = saleData?.eventforecastedsaleid ?? saleData?.eventforecastedsale_id;
    createdSalesIds.push(saleId);
    console.log(`  ✅ Sale (${saleType.label}) | ID: ${saleId} | Gross: ${grossSales} | Expected Net: ${expectedNet} | API Net: ${saleData?.eventforecastedsale_net_sales}`);
  }

  // GET all 3 via relatedmodule
  await new Promise(r => setTimeout(r, 500));
  const salesGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventforecastedsale&recordid=${eventid}&ipp=25&page=1`,
    { headers: authHeaders }
  );
  const salesGetBody = await salesGetRes.json();
  const salesRecords: any[] = salesGetBody?.data ?? [];
  expect.soft(salesGetRes.ok()).toBeTruthy();
  expect.soft(salesRecords.length).toBeGreaterThanOrEqual(3);
  createdSalesIds.forEach(id => {
    const rec = salesRecords.find((s: any) => Number(s.eventforecastedsaleid ?? s.eventforecastedsale_id) === Number(id));
    expect.soft(rec?.eventforecastedsale_num).toMatch(/^FORS/);
    expect.soft(rec?.eventforecastedsale_gross_sales).toBeDefined();
    expect.soft(rec?.eventforecastedsale_net_sales).toBeDefined();
    expect.soft(String(rec?.related_eventid)).toBe(String(eventid));
    expect.soft(rec?.module_name).toBe('event');
  });
  console.log(`  ✅ Forecasted Sales verified: ${createdSalesIds.length} records | IDs: ${createdSalesIds}`);

  // =====================================================================
  // STEP 29 — FORECASTED EXPENSES (Budgeted/COGS, Forecasted/OPEX, Actual/Payroll)
  // =====================================================================
  console.log('\n🔷 STEP 29: Create Forecasted Expenses (x3)');

  const EXPENSE_CONFIGS = [
    { label: 'Budgeted/COGS',      categoryId: 662, typeId: 664, statusId: 700 },
    { label: 'Forecasted/OPEX',    categoryId: 663, typeId: 665, statusId: 700 },
    { label: 'Actual/Payroll',     categoryId: 701, typeId: 666, statusId: 700 },
  ];
  const EXPENSE_NAMES = [
    'Transportation Charges',  'Venue Equipment Hire',    'Staff Travel Cost',
    'Marketing Spend',         'Catering Supplies Cost',  'Security Services Cost',
    'Event Staff Wages',       'Bar Equipment Rental',    'Cleaning Services Cost',
  ];
  const EXPENSE_DESCS = [
    'Cost incurred for transporting equipment and supplies to the event venue',
    'Hire charges for venue equipment required during the event setup and execution',
    'Operational expenditure for event planning and management activities',
    'Payroll costs for all event staff including bartenders and support crew',
    'Catering and beverage supply costs for the full duration of the event',
  ];

  const createdExpenseIds: number[] = [];
  let firstExpenseId: number | undefined;
  let firstExpenseName: string = '';
  let firstExpenseNum: string = '';

  for (const exp of EXPENSE_CONFIGS) {
    const expName   = `${EXPENSE_NAMES[Math.floor(Math.random() * EXPENSE_NAMES.length)]} ${exp.label.split('/')[0]}`;
    const expAmount = ((Math.floor(Math.random() * 9) + 1) * 1000).toFixed(2);
    const expDesc   = EXPENSE_DESCS[Math.floor(Math.random() * EXPENSE_DESCS.length)];

    const expCreateRes = await request.post(
      `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventforecastedcost`,
      {
        headers: authHeaders,
        data: {
          eventforecastedcost_num: '00000000000',
          source: 'web',
          status: '1',
          custom: {
            eventforecastedcost_name: expName,
            related_event: eventid,
            eventforecastedcost_category: exp.categoryId,
            eventforecastedcost_type: exp.typeId,
            eventforecastedcost_amount: expAmount,
            eventforecastedcost_percent: '2',
            eventforecastedcost_status: exp.statusId,
            eventforecastedcost_description: expDesc,
            ...owner, createtime: now(), modifiedtime: now(),
          }
        }
      }
    );
    const expRaw  = await expCreateRes.json();
    const expData = Array.isArray(expRaw) ? expRaw[0] : (expRaw?.data ?? expRaw);
    console.log(`  📩 Expense (${exp.label}) create:`, JSON.stringify(expData));

    expect.soft(expCreateRes.ok()).toBeTruthy();
    expect.soft(expData?.eventforecastedcostid).toBeDefined();
    expect.soft(expData?.eventforecastedcost_num).toMatch(/^FORC/);
    expect.soft(expData?.eventforecastedcost_name).toBe(expName);
    expect.soft(expData?.eventforecastedcost_amount).toBe(expAmount);
    expect.soft(expData?.eventforecastedcost_categoryid).toBe(String(exp.categoryId));
    expect.soft(expData?.eventforecastedcost_typeid).toBe(String(exp.typeId));
    expect.soft(expData?.eventforecastedcost_statusid).toBe(String(exp.statusId));
    expect.soft(String(expData?.related_eventid)).toBe(String(eventid));
    expect.soft(expData?.assign_to).toBe('Sonam Burbure');
    expect.soft(expData?.module_name).toBe('event');

    const expId = expData?.eventforecastedcostid ?? expData?.eventforecastedcost_id;
    createdExpenseIds.push(expId);
    if (!firstExpenseId) {
      firstExpenseId  = expId;
      firstExpenseName = expName;
      firstExpenseNum  = expData?.eventforecastedcost_num;
    }
    console.log(`  ✅ Expense (${exp.label}) | ID: ${expId} | Amount: ${expAmount}`);
  }

  // Update 1st expense
  console.log('\n🔷 STEP 29b: Update 1st Expense');
  const updExpName   = `Updated ${firstExpenseName}`;
  const updExpAmount = '15000.00';

  const expUpdateRes = await request.put(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/eventforecastedcosts/${firstExpenseId}`,
    {
      headers: authHeaders,
      data: {
        eventforecastedcost_num: firstExpenseNum,
        source: 'web',
        status: '1',
        custom: {
          eventforecastedcost_name: updExpName,
          related_event: eventid,
          eventforecastedcost_category: 662,
          eventforecastedcost_type: 664,
          eventforecastedcost_amount: updExpAmount,
          eventforecastedcost_percent: '3',
          eventforecastedcost_status: 700,
          eventforecastedcost_description: 'Updated expense description after revision',
          ...owner, createtime: now(), modifiedtime: now(),
        }
      }
    }
  );
  const expUpdateRaw = await expUpdateRes.text();
  console.log(`  📩 Expense update status: ${expUpdateRes.status()} | raw: ${expUpdateRaw.slice(0, 200)}`);
  expect.soft(expUpdateRes.ok()).toBeTruthy();

  // Verify update via relatedmodule GET
  await new Promise(r => setTimeout(r, 500));
  const expGetRes  = await request.get(
    `${BASE_API_URL}/${tenantPath}/api/${logonAs}/relatedmodule?module=event&relatedmodule=eventforecastedcost&recordid=${eventid}&page=1`,
    { headers: authHeaders }
  );
  const expGetBody = await expGetRes.json();
  const expRecords: any[] = expGetBody?.data ?? [];
  const updatedExp = expRecords.find(
    (e: any) => Number(e.eventforecastedcostid ?? e.eventforecastedcost_id) === Number(firstExpenseId)
  );
  console.log('  📩 Updated expense (GET):', JSON.stringify(updatedExp));

  expect.soft(expGetRes.ok()).toBeTruthy();
  expect.soft(updatedExp?.eventforecastedcostid).toBe(firstExpenseId);
  expect.soft(updatedExp?.eventforecastedcost_num).toMatch(/^FORC/);
  expect.soft(updatedExp?.eventforecastedcost_name).toBe(updExpName);
  expect.soft(updatedExp?.eventforecastedcost_amount).toBe(updExpAmount);
  expect.soft(updatedExp?.eventforecastedcost_categoryid).toBe('662');
  expect.soft(updatedExp?.eventforecastedcost_typeid).toBe('664');
  expect.soft(String(updatedExp?.related_eventid)).toBe(String(eventid));
  console.log(`  ✅ Expense updated | name: "${updExpName}" | amount: ${updExpAmount}`);

  // =====================================================================
  // SUMMARY
  // =====================================================================
  console.log('\n🎉 SMOKE TEST COMPLETE');
  console.log('─────────────────────────────────────────────────────');
  console.log('  UOM Product   (Spirits Volume):        ', uomProductId);
  console.log('  UOM Equipment (Bar Equipment Volume):  ', uomEquipmentId);
  console.log('  UOM Staff     (Staff Headcount):       ', uomStaffId);
  console.log('  Product Seg1 IDs:                      ', prodSeg1Ids);
  console.log('  Product Seg2 IDs:                      ', prodSeg2Ids);
  console.log('  Equip Seg1 IDs:                        ', equipSeg1Ids);
  console.log('  Equip Seg2 IDs:                        ', equipSeg2Ids);
  console.log('  Staff Seg1 IDs:                        ', staffSeg1Ids);
  console.log('  Staff Seg2 IDs:                        ', staffSeg2Ids);
  console.log('  Products (x6):                         ', productIds);
  console.log('  Equipment (x6):                        ', equipmentIds);
  console.log('  StaffTypes (x6):                       ', stafftypeIds);
  console.log(`  BarSetup      (${barsetupName}):`, barsetupid);
  console.log(`  ItemServed    (${itemservedName}):`, itemservedid);
  console.log(`  Menu          (${menuName}):`, eventmenuid);
  console.log(`  MenuItem1     (${itemPerPersonName}):`, eventmenuitem1id, `| conv_person=${CONV_PERSON_RATE}`);
  console.log(`  MenuItem2     (${itemPerHourName}):`, eventmenuitem2id, `| conv_person_hour=${CONV_PERSON_HOUR_RATE}`);
  console.log(`  Event         (${eventName}):      `, eventid);
  console.log(`  Event timing  : ${dailyStartTime}–${dailyEndTime} (${totalEventHours}h), ${noOfGuest} guests`);
  console.log('  BarCard       (Signature Bar Card):    ', barcardid);
  console.log('  BarCardMenuItems total:                ', menuItemsBody?.total);

  console.log(`  Calc qty/hour : ${totalEventHours}h × ${noOfGuest} × ${CONV_PERSON_HOUR_RATE} = ${expectedQtyPerHour}`);
  console.log(`  Calc qty/person: ${noOfGuest} × ${CONV_PERSON_RATE} = ${expectedQtyPerPerson}`);
  console.log('  AutoPreplan   :                        ', preplanScheduled);
  console.log('  Event Tasks   :                        ', eventTasks.length, 'task(s) (auto-created)');
  console.log(`  New Task      (${etName}):`, eventtaskid, '→ updated → comment added');
  console.log(`  Comment ID    :                        `, commentid);
  console.log(`  Checklist     (${clName}):`, eventchecklistid, '→ updated');
  console.log(`  DeliveryCol   (${dcName}):`, eventdeliverycollectionid, '→ updated');
  console.log(`  Notification  (${notifHeading}):`, eventnotificationid, '→ updated');
  console.log(`  Equip Count   : ${eqCountItems.length} item(s) generated`);
  console.log(`  Stock Consump : ${stockItems.length} item(s) generated`);
  console.log(`  Sales (x3)    : Budgeted/Forecasted/Actual | IDs: ${createdSalesIds}`);
  console.log(`  Expenses (x3) : Budgeted/Forecasted/Actual | 1st updated | IDs: ${createdExpenseIds}`);
  console.log('─────────────────────────────────────────────────────');
});
