export interface SupplyCapsUnits {
  perUserCapUnits: bigint;
  vaultCapUnits: bigint;
}

const PER_USER_SUPPLY_CAP = import.meta.env.VITE_PER_USER_SUPPLY_CAP;
const VAULT_SUPPLY_CAP = import.meta.env.VITE_VAULT_SUPPLY_CAP;

export const getSupplyCapsForVault = (assetDecimals: number): SupplyCapsUnits => {
  const pow10 = (d: number) => {
    let x = 1n;
    for (let i = 0; i < d; i++) x *= 10n;
    return x;
  };
  const base = pow10(assetDecimals);
  const perUserCapUnits = BigInt(Math.floor(PER_USER_SUPPLY_CAP)) * base;
  const vaultCapUnits = BigInt(Math.floor(VAULT_SUPPLY_CAP)) * base;
  return { perUserCapUnits, vaultCapUnits };
};

export const RAW_CAPS = {
  perUser: PER_USER_SUPPLY_CAP,
  vault: VAULT_SUPPLY_CAP,
};