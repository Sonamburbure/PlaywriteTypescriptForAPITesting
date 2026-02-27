let authToken: string | undefined;
let tenantPath: string | undefined;
let logonAs: string | undefined;

// ---------- Auth Token ----------
export const setAuthToken = (token: string) => {
  authToken = token;
};

export const getAuthToken = (): string => {
  if (!authToken) {
    throw new Error('Auth token not set. Did global-setup run successfully?');
  }
  return authToken;
};

// ---------- Tenant Path ----------
export const setTenantPath = (tenant: string) => {
  tenantPath = tenant;
};

export const getTenantPath = (): string => {
  if (!tenantPath) {
    throw new Error('Tenant path not set. Login response missing tenant info.');
  }
  return tenantPath;
};

// ---------- Logon As ----------
export const setLogonAs = (value: string) => {
  logonAs = value;
};

export const getLogonAs = (): string => {
  if (!logonAs) {
    throw new Error('LogonAs not set.');
  }
  return logonAs;
};

// ---------- Optional Debug Helper ----------
export const debugTokenStore = () => ({
  authToken,
  tenantPath,
  logonAs,
});
