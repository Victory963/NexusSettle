import type { ClearingMode } from "./types";

const MODES = new Set<ClearingMode>(["demo", "testnet", "mainnet"]);

export function getClearingMode(): ClearingMode {
  const configured = process.env.CLEARING_MODE?.toLowerCase() as ClearingMode | undefined;
  if (configured && !MODES.has(configured)) {
    throw new Error(`Invalid CLEARING_MODE: ${configured}`);
  }

  const mode = configured ?? (process.env.NODE_ENV === "production" ? "testnet" : "demo");
  if (mode === "mainnet" && process.env.CLEARING_MAINNET_ENABLED !== "true") {
    throw new Error("Mainnet is locked. Set CLEARING_MAINNET_ENABLED=true only after release approval.");
  }
  return mode;
}

export function isDemoMode() {
  return getClearingMode() === "demo";
}
