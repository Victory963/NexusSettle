import type { HexAddress, NetworkId, StableAsset } from "./types";

/** Canonical Circle / Tether contracts. Never trust a token by symbol. */
export const TOKEN_REGISTRY: Record<
  Exclude<NetworkId, "simulated">,
  Record<StableAsset, HexAddress>
> = {
  "base-sepolia": {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdt: "0x3333333333333333333333333333333333333333",
  },
  "base-mainnet": {
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
  },
};

export const STABLE_DECIMALS = 6;

export const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function tokenFor(network: NetworkId, asset: StableAsset): HexAddress {
  if (network === "simulated") {
    return asset === "usdc"
      ? "0x1111111111111111111111111111111111111111"
      : "0x2222222222222222222222222222222222222222";
  }
  return TOKEN_REGISTRY[network][asset];
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
