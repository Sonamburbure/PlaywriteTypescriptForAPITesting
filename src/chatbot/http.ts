import { getAuthToken, getTenantPath, getLogonAs } from '../utils/tokenStore.js';

// Bypass self-signed / not-yet-valid SSL on stage
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function getAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
    'x-automate-secret': process.env.AUTOMATE_SECRET ?? '',
  };
}

export function apiBase(): string {
  return `${process.env.BASE_API_URL}/${getTenantPath()}/api/${getLogonAs()}`;
}

export async function apiPost(endpoint: string, data: unknown): Promise<any> {
  const res = await fetch(`${apiBase()}/${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const body: any = await res.json();
  if (!res.ok) {
    throw new Error(`POST /${endpoint} failed (${res.status}): ${JSON.stringify(body).slice(0, 400)}`);
  }
  return Array.isArray(body) ? body[0] : body;
}

export async function apiGet(endpoint: string, qs: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${apiBase()}/${endpoint}`);
  Object.entries(qs).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  return res.json();
}

export function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const OWNER = { ownerid: 18, assign_to: 'Sonam Burbure' };

export async function ensureUom(name: string): Promise<number> {
  const s = await apiGet('unitofmeasure', { filter: `unitofmeasure_name=${name}`, ipp: '5', page: '1' });
  const found = s?.data?.[0];
  if (found?.unitofmeasureid) return found.unitofmeasureid;
  const r = await apiPost('unitofmeasure', {
    unitofmeasure_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      unitofmeasure_name: name, allow_multiple_product: '53',
      default_consumable_unit: 527, consumable_quantity: '5000.00',
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });
  return r?.unitofmeasureid ?? r?.id;
}

export async function ensureSeg1(name: string, uomId: number, segType: number): Promise<number> {
  const s = await apiGet('segment1', { filter: `segment1_name=${name}`, ipp: '5', page: '1' });
  const found = s?.data?.[0];
  if (found?.segment1id) return found.segment1id;
  const r = await apiPost('segment1', {
    segment1_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      segment1_name: name, segment_type: segType,
      segment1_consumable_uom: 527, related_unitofmeasure: uomId,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });
  return r?.segment1id ?? r?.id;
}

export async function ensureSeg2(name: string, segType: number): Promise<number> {
  const s = await apiGet('segment2', { filter: `segment2_name=${name}`, ipp: '5', page: '1' });
  const found = s?.data?.[0];
  if (found?.segment2id) return found.segment2id;
  const r = await apiPost('segment2', {
    segment2_num: String(Date.now()).slice(-11), source: 'web', status: '1',
    custom: {
      segment2_name: name, segment2_segment_type: segType,
      ...OWNER, createtime: nowStr(), modifiedtime: nowStr(),
    },
  });
  return r?.segment2id ?? r?.id;
}
