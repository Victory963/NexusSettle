import type { HexAddress, NetworkId, StableAsset } from "./types";

/** Canonical Circle / Tether contracts. Never trust a token by symbol. */
export const TOKEN_REGISTRY: Record<NetworkId, Partial<Record<StableAsset, HexAddress>>> = {
  "eip155:31337": {
    usdc: "0x1111111111111111111111111111111111111111",
    usdt: "0x2222222222222222222222222222222222222222",
  },
  "eip155:84532": {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  "eip155:2201": {
    usdt: "0x78Cf24370174180738C5B8E352B6D14c83a6c9A9",
  },
  "eip155:8453": {
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  },
  // Circle-issued native USDC. USDT is intentionally absent.
  "eip155:10143": {
    usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  },
  "eip155:143": {
    usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  },
};

export const STABLE_DECIMALS = 6;

export const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function tokenFor(network: NetworkId, asset: StableAsset): HexAddress {
  const token = TOKEN_REGISTRY[network][asset];
  if (!token) throw new Error(`${asset.toUpperCase()} is not configured on ${network}`);
  return token;
}

export function toAtomic(human: number): string {
  return String(Math.round(human * 10 ** STABLE_DECIMALS));
}

export function fromAtomic(atomic: string): number {
  return Number(atomic) / 10 ** STABLE_DECIMALS;
}

export function checksum(addr: string): HexAddress {
  return addr.toLowerCase() as HexAddress;
}

export function sameAddr(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}
