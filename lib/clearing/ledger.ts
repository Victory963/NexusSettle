import type { ClearingSnapshot, LedgerEntry } from "./types";

export function appendLedger(state: ClearingSnapshot, entry: Omit<LedgerEntry, "id" | "at">) {
  const row: LedgerEntry = {
    ...entry,
    id: crypto.randomUUID(),
    at: Date.now(),
  };
  state.ledger.unshift(row);
  return row;
}

export function balances(state: ClearingSnapshot) {
  const map = new Map<string, { usdc: bigint; usdt: bigint }>();
  const bump = (agentId: string) => {
    if (!map.has(agentId)) map.set(agentId, { usdc: BigInt(0), usdt: BigInt(0) });
    return map.get(agentId)!;
  };
  for (const row of [...state.ledger].reverse()) {
    const from = bump(row.fromAgentId);
    const to = bump(row.toAgentId);
    const n = BigInt(row.amountAtomic);
    if (row.kind === "escrow_lock") {
      from[row.asset] -= n;
    } else if (row.kind === "escrow_refund") {
      to[row.asset] += n;
    } else {
      from[row.asset] -= n;
      to[row.asset] += n;
    }
  }
  return Object.fromEntries(
    [...map.entries()].map(([id, v]) => [id, { usdc: v.usdc.toString(), usdt: v.usdt.toString() }]),
  );
}
