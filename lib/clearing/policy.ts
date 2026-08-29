import { fromAtomic, sameAddr } from "./assets";
import type { GuardrailDecision, HexAddress, PaymentRequirement, SessionPolicy } from "./types";

export type SpendState = {
  spentAtomic: string;
  paysByMerchant: Record<string, number>;
};

export function emptySpend(): SpendState {
  return { spentAtomic: "0", paysByMerchant: {} };
}

/**
 * Deterministic sandbox. The LLM never supplies payee or amount.
 * Those fields come only from a 402 challenge that this engine already parsed.
 */
export function evaluatePolicy(input: {
  policy: SessionPolicy;
  requirement: PaymentRequirement;
  spend: SpendState;
  now?: number;
}): GuardrailDecision {
  const { policy, requirement, spend } = input;
  const now = input.now ?? Date.now();

  if (now > policy.validUntil) return { ok: false, reason: "Session key expired" };
  if (requirement.asset !== policy.asset) {
    return { ok: false, reason: `Asset ${requirement.asset} is not allowed by session policy` };
  }
  if (!policy.merchantWhitelist.some((a) => sameAddr(a, requirement.payTo))) {
    return { ok: false, reason: "Payee is not on the merchant whitelist" };
  }
  if (!policy.allowedContracts.some((a) => sameAddr(a, requirement.token))) {
    return { ok: false, reason: "Token contract is not on the allowlist (possible fake stablecoin)" };
  }

  const amount = BigInt(requirement.amountAtomic);
  if (amount <= BigInt(0)) return { ok: false, reason: "Malformed amount" };
  if (amount > BigInt(policy.maxPerTx)) {
    return {
      ok: false,
      reason: `Amount ${fromAtomic(requirement.amountAtomic)} exceeds per-tx cap ${fromAtomic(policy.maxPerTx)}`,
    };
  }
  if (BigInt(spend.spentAtomic) + amount > BigInt(policy.maxPerTask)) {
    return { ok: false, reason: "Task budget exceeded" };
  }

  const key = requirement.payTo.toLowerCase();
  const used = spend.paysByMerchant[key] ?? 0;
  if (used >= policy.maxPaysPerMerchant) {
    return { ok: false, reason: "Idempotency: merchant already paid in this task" };
  }

  return { ok: true };
}

export function applySpend(spend: SpendState, payTo: HexAddress, amountAtomic: string): SpendState {
  const key = payTo.toLowerCase();
  return {
    spentAtomic: String(BigInt(spend.spentAtomic) + BigInt(amountAtomic)),
    paysByMerchant: { ...spend.paysByMerchant, [key]: (spend.paysByMerchant[key] ?? 0) + 1 },
  };
}
