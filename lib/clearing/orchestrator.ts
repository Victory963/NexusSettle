import { checksum, tokenFor, toAtomic } from "./assets";
import { encodeTransferLog, verifyStableTransfer } from "./erc20";
import { lockEscrow, settleEscrow } from "./escrow";
import { appendLedger, balances } from "./ledger";
import { applySpend, emptySpend, evaluatePolicy } from "./policy";
import { paymentRequiredBody, x402Headers } from "./x402";
import type {
  AgentCredential,
  ClearingSnapshot,
  EvmReceipt,
  HexAddress,
  PaymentRequirement,
  SessionPolicy,
  StableAsset,
  TxHash,
} from "./types";

const DEMO_PRICE = toAtomic(0.05);
const INTEL = {
  alpha: "2026 Q3 autonomous agent commerce: USDC on Base remains the default machine-settlement unit; x402 v2 headers plus AP2 mandates are the interop path.",
};

export function emptyState(): ClearingSnapshot {
  return { agents: [], policies: [], consumedTx: [], ledger: [], escrows: [], batchVouchers: [] };
}

export function seedDemo(state: ClearingSnapshot) {
  if (state.agents.length) return state;
  const seller: AgentCredential = {
    id: "agent-seller-intel",
    displayName: "Intel Seller Agent",
    role: "seller",
    ownerDid: "did:lumen:studio:treasury",
    wallet: checksum("0x71C7656EC7ab88b098defB751B7401B5f6d8976F"),
    createdAt: Date.now(),
    reputation: 82,
  };
  const buyer: AgentCredential = {
    id: "agent-buyer-research",
    displayName: "Research Buyer Agent",
    role: "buyer",
    ownerDid: "did:lumen:studio:ops",
    wallet: checksum("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"),
    createdAt: Date.now(),
    reputation: 71,
  };
  state.agents.push(seller, buyer);
  const usdc = tokenFor("simulated", "usdc");
  const usdt = tokenFor("simulated", "usdt");
  const policy: SessionPolicy = {
    agentId: buyer.id,
    maxPerTx: toAtomic(0.5),
    maxPerTask: toAtomic(2),
    asset: "usdc",
    merchantWhitelist: [seller.wallet],
    allowedContracts: [usdc, usdt],
    validUntil: Date.now() + 24 * 60 * 60 * 1000,
    maxPaysPerMerchant: 1,
  };
  state.policies.push(policy);
  return state;
}

export function sellerRequirement(state: ClearingSnapshot, asset: StableAsset = "usdc"): PaymentRequirement {
  seedDemo(state);
  const seller = state.agents.find((a) => a.role === "seller")!;
  return {
    scheme: "exact",
    network: "simulated",
    asset,
    payTo: seller.wallet,
    token: tokenFor("simulated", asset),
    amountAtomic: DEMO_PRICE,
    resource: "/api/clearing/intel",
    description: "Premium market intelligence payload",
  };
}

export function simulateReceipt(params: {
  token: HexAddress;
  from: HexAddress;
  to: HexAddress;
  amountAtomic: string;
  txHash?: TxHash;
}): EvmReceipt {
  return {
    transactionHash: params.txHash ?? (`0x${crypto.randomUUID().replace(/-/g, "")}` as TxHash),
    status: 1,
    logs: [encodeTransferLog({ token: params.token, from: params.from, to: params.to, value: params.amountAtomic })],
  };
}

export function consumePayment(state: ClearingSnapshot, receipt: EvmReceipt, requirement: PaymentRequirement) {
  if (state.consumedTx.includes(receipt.transactionHash)) {
    return { ok: false as const, reason: "Tx hash already consumed" };
  }
  const verified = verifyStableTransfer(receipt, {
    payTo: requirement.payTo,
    token: requirement.token,
    amountAtomic: requirement.amountAtomic,
  });
  if (!verified.ok) return verified;
  state.consumedTx.push(receipt.transactionHash);
  return { ok: true as const, event: verified.event };
}

export function runExactA2A(state: ClearingSnapshot, asset: StableAsset = "usdc") {
  seedDemo(state);
  const buyer = state.agents.find((a) => a.role === "buyer")!;
  const seller = state.agents.find((a) => a.role === "seller")!;
  const policy = state.policies.find((p) => p.agentId === buyer.id)!;
  const requirement = sellerRequirement(state, asset);
  const spend = emptySpend();
  const gate = evaluatePolicy({ policy: { ...policy, asset }, requirement, spend });
  if (!gate.ok) {
    return { ok: false as const, step: "guardrail", reason: gate.reason, requirement };
  }
  const receipt = simulateReceipt({
    token: requirement.token,
    from: buyer.wallet,
    to: requirement.payTo,
    amountAtomic: requirement.amountAtomic,
  });
  const paid = consumePayment(state, receipt, requirement);
  if (!paid.ok) return { ok: false as const, step: "settlement", reason: paid.reason, requirement };
  applySpend(spend, requirement.payTo, requirement.amountAtomic);
  const entry = appendLedger(state, {
    kind: "transfer",
    fromAgentId: buyer.id,
    toAgentId: seller.id,
    asset,
    amountAtomic: requirement.amountAtomic,
    txHash: receipt.transactionHash,
    resource: requirement.resource,
    note: "x402 exact scheme — USDC/USDT Transfer event verified against canonical contract",
  });
  return {
    ok: true as const,
    scheme: "exact" as const,
    requirement,
    headers: x402Headers(requirement),
    challenge: paymentRequiredBody(requirement),
    txHash: receipt.transactionHash,
    ledger: entry,
    payload: { ...INTEL, verifiedBy: receipt.transactionHash },
    balances: balances(state),
  };
}

export function runBatchA2A(state: ClearingSnapshot, calls = 12, asset: StableAsset = "usdc") {
  seedDemo(state);
  const buyer = state.agents.find((a) => a.role === "buyer")!;
  const seller = state.agents.find((a) => a.role === "seller")!;
  const unit = toAtomic(0.001);
  const total = String(BigInt(unit) * BigInt(calls));
  const voucherId = crypto.randomUUID();
  state.batchVouchers.push({
    id: voucherId,
    buyerId: buyer.id,
    sellerId: seller.id,
    asset,
    amountAtomic: total,
    settled: true,
  });
  const entry = appendLedger(state, {
    kind: "batch_settle",
    fromAgentId: buyer.id,
    toAgentId: seller.id,
    asset,
    amountAtomic: total,
    txHash: `0xbatch${voucherId.replace(/-/g, "").slice(0, 58)}`,
    resource: "/api/clearing/intel",
    note: `Authorize-first, settle-later: ${calls} sub-cent calls aggregated into one on-chain redemption`,
  });
  return { ok: true as const, scheme: "batch-settlement" as const, calls, unit, total, ledger: entry };
}

export function runOutcomeA2A(state: ClearingSnapshot, succeed: boolean, asset: StableAsset = "usdc") {
  seedDemo(state);
  const buyer = state.agents.find((a) => a.role === "buyer")!;
  const seller = state.agents.find((a) => a.role === "seller")!;
  const predicate = "compile_ok:true";
  const deal = lockEscrow({
    state,
    buyerId: buyer.id,
    sellerId: seller.id,
    asset,
    amountAtomic: toAtomic(0.2),
    predicate,
  });
  const attested = succeed ? predicate : "compile_ok:false";
  const settled = settleEscrow(state, deal.id, attested);
  return { ok: true as const, scheme: "outcome-escrow" as const, deal: settled, attested };
}

export function rejectFakeToken(state: ClearingSnapshot) {
  seedDemo(state);
  const requirement = sellerRequirement(state, "usdc");
  const fakeReceipt = simulateReceipt({
    token: checksum("0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef"),
    from: state.agents.find((a) => a.role === "buyer")!.wallet,
    to: requirement.payTo,
    amountAtomic: requirement.amountAtomic,
  });
  return consumePayment(state, fakeReceipt, requirement);
}

export function rejectPromptInjectionPayee(state: ClearingSnapshot) {
  seedDemo(state);
  const buyer = state.agents.find((a) => a.role === "buyer")!;
  const policy = state.policies.find((p) => p.agentId === buyer.id)!;
  const requirement = sellerRequirement(state, "usdc");
  requirement.payTo = checksum("0x000000000000000000000000000000000000dEaD");
  return evaluatePolicy({ policy, requirement, spend: emptySpend() });
}
