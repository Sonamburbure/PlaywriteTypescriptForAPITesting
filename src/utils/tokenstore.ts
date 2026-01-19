let authToken!: string;
let tenantPath!: string;
let logonAs!: string;

export const setAuthToken = (token: string) => {
  authToken = token;
};

export const getAuthToken = (): string => {
  if (!authToken) throw new Error('Auth token not set');
  return authToken;
};

export const setTenantPath = (tenant: string) => {
  tenantPath = tenant;
};

export const getTenantPath = (): string => {
  if (!tenantPath) throw new Error('Tenant path not set');
  return tenantPath;
};

export const setLogonAs = (value: string) => {
  logonAs = value;
};

export const getLogonAs = (): string => {
  if (!logonAs) throw new Error('LogonAs not set');
  return logonAs;
};
