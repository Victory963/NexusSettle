import { createHash } from "crypto";
import type { ClearingSnapshot, EscrowDeal, StableAsset } from "./types";
import { appendLedger } from "./ledger";

export function hashPredicate(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function lockEscrow(input: {
  state: ClearingSnapshot;
  buyerId: string;
  sellerId: string;
  asset: StableAsset;
  amountAtomic: string;
  predicate: string;
}): EscrowDeal {
  const deal: EscrowDeal = {
    id: crypto.randomUUID(),
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    asset: input.asset,
    amountAtomic: input.amountAtomic,
    predicateHash: hashPredicate(input.predicate),
    status: "locked",
    createdAt: Date.now(),
  };
  input.state.escrows.unshift(deal);
  appendLedger(input.state, {
    kind: "escrow_lock",
    fromAgentId: input.buyerId,
    toAgentId: "escrow",
    asset: input.asset,
    amountAtomic: input.amountAtomic,
    txHash: `0xescrow${deal.id.replace(/-/g, "").slice(0, 56)}`,
    resource: deal.id,
    note: "Outcome escrow locked until attested result matches predicate",
  });
  return deal;
}

export function settleEscrow(
  state: ClearingSnapshot,
  dealId: string,
  attestedResult: string,
): EscrowDeal {
  const deal = state.escrows.find((d) => d.id === dealId);
  if (!deal) throw new Error("Escrow not found");
  if (deal.status !== "locked") throw new Error("Escrow already settled");
  if (hashPredicate(attestedResult) !== deal.predicateHash) {
    deal.status = "refunded";
    deal.settledAt = Date.now();
    appendLedger(state, {
      kind: "escrow_refund",
      fromAgentId: "escrow",
      toAgentId: deal.buyerId,
      asset: deal.asset,
      amountAtomic: deal.amountAtomic,
      txHash: `0xrefund${deal.id.replace(/-/g, "").slice(0, 56)}`,
      resource: deal.id,
      note: "Predicate mismatch — funds returned to buyer",
    });
    return deal;
  }
  deal.status = "released";
  deal.settledAt = Date.now();
  appendLedger(state, {
    kind: "escrow_release",
    fromAgentId: "escrow",
    toAgentId: deal.sellerId,
    asset: deal.asset,
    amountAtomic: deal.amountAtomic,
    txHash: `0xrelease${deal.id.replace(/-/g, "").slice(0, 56)}`,
    resource: deal.id,
    note: "Outcome attested — funds released to seller",
  });
  return deal;
}
