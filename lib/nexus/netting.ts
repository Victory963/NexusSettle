import type { BilateralObligation, SettlementInstruction } from "./types";

export class NettingReject extends Error {}

export function multilateralNet(gross: BilateralObligation[]): Map<string, bigint> {
  const net = new Map<string, bigint>();
  for (const { debtor, creditor, amount } of gross) {
    if (amount <= 0n) throw new NettingReject("obligation amount must be positive");
    if (debtor === creditor) throw new NettingReject("self-obligation is forbidden");
    net.set(debtor, (net.get(debtor) ?? 0n) - amount);
    net.set(creditor, (net.get(creditor) ?? 0n) + amount);
  }
  const total = [...net.values()].reduce((sum, value) => sum + value, 0n);
  if (total !== 0n) throw new NettingReject(`netting imbalance: ${total}`);
  return net;
}

/** Star topology through CLEARING: at most one instruction per party, not N². */
export function settlementInstructions(net: Map<string, bigint>): SettlementInstruction[] {
  const instructions: SettlementInstruction[] = [];
  for (const [party, position] of net) {
    if (position < 0n) instructions.push({ from: party, to: "CLEARING", amount: -position });
    if (position > 0n) instructions.push({ from: "CLEARING", to: party, amount: position });
  }
  const total = instructions.reduce((sum, row) => {
    return row.from === "CLEARING" ? sum - row.amount : sum + row.amount;
  }, 0n);
  if (total !== 0n) throw new NettingReject(`instruction imbalance: ${total}`);
  return instructions;
}

export function serializeNet(net: Map<string, bigint>) {
  return Object.fromEntries([...net.entries()].map(([party, value]) => [party, value.toString()]));
}
