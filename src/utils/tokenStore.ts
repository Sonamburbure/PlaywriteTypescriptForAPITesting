import fs from 'fs';

const FILE = 'auth.json';

/* ---------- WRITE ---------- */

export const setAuthToken = (token: string) => {
  const data = read();
  data.authToken = token;
  write(data);
};

export const setTenantPath = (tenant: string) => {
  const data = read();
  data.tenantPath = tenant;
  write(data);
};

export const setLogonAs = (value: string) => {
  const data = read();
  data.logonAs = value;
  write(data);
};

/* ---------- READ ---------- */

export const getAuthToken = (): string => {
  const data = read();
  if (!data.authToken) {
    throw new Error('Auth token not set. Did global-setup run successfully?');
  }
  return data.authToken;
};

export const getTenantPath = (): string => {
  const data = read();
  if (!data.tenantPath) {
    throw new Error('Tenant path not set.');
  }
  return data.tenantPath;
};

export const getLogonAs = (): string => {
  const data = read();
  if (!data.logonAs) {
    throw new Error('LogonAs not set.');
  }
  return data.logonAs;
};

/* ---------- DEBUG ---------- */

export const debugTokenStore = () => read();

/* ---------- HELPERS ---------- */

function read(): any {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
}

function write(data: any) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}