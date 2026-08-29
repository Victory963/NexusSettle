import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { emptyState, seedDemo } from "./orchestrator";
import type { ClearingSnapshot } from "./types";

const DB = join(process.cwd(), "data", "clearing.json");

function ensure() {
  mkdirSync(dirname(DB), { recursive: true });
  try {
    readFileSync(DB, "utf8");
  } catch {
    writeFileSync(DB, JSON.stringify(seedDemo(emptyState()), null, 2), "utf8");
  }
}

export function loadClearing(): ClearingSnapshot {
  ensure();
  const raw = JSON.parse(readFileSync(DB, "utf8")) as ClearingSnapshot;
  return seedDemo({
    agents: raw.agents ?? [],
    policies: raw.policies ?? [],
    consumedTx: raw.consumedTx ?? [],
    ledger: raw.ledger ?? [],
    escrows: raw.escrows ?? [],
    batchVouchers: raw.batchVouchers ?? [],
  });
}

export function saveClearing(state: ClearingSnapshot) {
  ensure();
  writeFileSync(DB, JSON.stringify(state, null, 2), "utf8");
  return state;
}
