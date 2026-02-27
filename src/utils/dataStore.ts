let accountId: number;
let accountName: string;

export const setAccountData = (id: number, name: string) => {
  accountId = id;
  accountName = name;
};

export const getAccountId = () => {
  if (!accountId) throw new Error('Account ID not set');
  return accountId;
};

export const getAccountName = () => {
  if (!accountName) throw new Error('Account Name not set');
  return accountName;
};
