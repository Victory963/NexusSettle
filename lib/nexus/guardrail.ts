import type { GuardrailResult, IntentContext, PaymentIntent } from "./types";

export class GuardrailReject extends Error {}

const EIP3009_CAPABLE = new Set<string>([
  "USDC:eip155:31337",
  "USDC:eip155:84532",
  "USDC:eip155:8453",
  "USDC:eip155:10143",
  "USDC:eip155:143",
  "USDT:eip155:31337",
  "USDT:eip155:42161",
]);

export function supportsEip3009(asset: PaymentIntent["asset"], network: PaymentIntent["network"]) {
  return EIP3009_CAPABLE.has(`${asset}:${network}`);
}

export function authorizeIntent(intent: PaymentIntent, ctx: IntentContext): GuardrailResult {
  if (!ctx.allowedAssets.includes(intent.asset)) {
    return { ok: false, reason: `asset ${intent.asset} is not allowed` };
  }
  if (!ctx.allowedPayees.includes(intent.payeeAgentId)) {
    return { ok: false, reason: "payee is not on the allowlist" };
  }
  const amount = BigInt(intent.amountAtomic);
  if (amount <= 0n) return { ok: false, reason: "amount must be positive" };
  if (amount > ctx.perTxLimit) return { ok: false, reason: "per-tx limit exceeded" };
  if (ctx.spentToday + amount > ctx.dailyLimit) {
    return { ok: false, reason: "daily limit / denial-of-wallet guard" };
  }
  if (ctx.sanctionsScore >= 30) return { ok: false, reason: "payee sanctioned or high-risk" };
  if (ctx.consumedNonces.has(intent.nonce)) return { ok: false, reason: "nonce replay" };
  if ((intent.asset === "USDC" || intent.asset === "USDT") && intent.network.startsWith("eip155:")) {
    if (!ctx.eip3009 && !supportsEip3009(intent.asset, intent.network)) {
      return { ok: false, reason: `${intent.asset} on ${intent.network} has no EIP-3009; refuse naive transfer` };
    }
  }
  if (intent.asset === "USDT" && (intent.network === "eip155:8453" || intent.network === "eip155:143" || intent.network === "eip155:10143")) {
    return { ok: false, reason: "native USDT is not enabled on this chain; settle USDC" };
  }
  return { ok: true };
}

export function assertAuthorized(intent: PaymentIntent, ctx: IntentContext) {
  const result = authorizeIntent(intent, ctx);
  if (!result.ok) throw new GuardrailReject(result.reason);
}
