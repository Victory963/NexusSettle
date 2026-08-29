import { tokenFor, toAtomic } from "./assets";
import { verifyStableTransfer } from "./erc20";
import {
  deterministicDemoTxHash,
  emptyState,
  rejectFakeToken,
  rejectPromptInjectionPayee,
  runExactA2A,
  runOutcomeA2A,
  seedDemo,
  sellerRequirement,
  settleAuthorizedPayment,
  simulateReceipt,
} from "./orchestrator";
import { emptySpend, evaluatePolicy } from "./policy";
import type { PaymentProof } from "./types";

export type TestResult = { name: string; pass: boolean; detail: string };

export function runClearingSelfTests(): TestResult[] {
  const results: TestResult[] = [];
  const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

  const exact = runExactA2A(emptyState(), "usdc");
  check("exact USDC A2A", exact.ok === true, exact.ok ? exact.txHash : "failed");

  const usdt = runExactA2A(emptyState(), "usdt");
  check("exact USDT A2A", usdt.ok === true && usdt.requirement.asset === "usdt", usdt.ok ? usdt.requirement.token : "failed");

  const fake = rejectFakeToken(emptyState());
  check("reject fake stablecoin", fake.ok === false, fake.ok ? "accepted fake" : fake.reason);

  const inject = rejectPromptInjectionPayee(emptyState());
  check("reject injected payee", inject.ok === false, inject.ok ? "injection passed" : inject.reason);

  const outcomeOk = runOutcomeA2A(emptyState(), true);
  check("outcome escrow release", outcomeOk.deal.status === "released", outcomeOk.deal.status);

  const outcomeFail = runOutcomeA2A(emptyState(), false);
  check("outcome escrow refund", outcomeFail.deal.status === "refunded", outcomeFail.deal.status);

  const underpay = verifyStableTransfer(
    simulateReceipt({
      token: tokenFor("eip155:31337", "usdc"),
      from: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      amountAtomic: toAtomic(0.01),
    }),
    {
      payer: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      payTo: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      token: tokenFor("eip155:31337", "usdc"),
      amountAtomic: toAtomic(0.05),
    },
  );
  check("reject underpayment", underpay.ok === false, underpay.ok ? "underpay accepted" : underpay.reason);

  const expired = evaluatePolicy({
    policy: {
      agentId: "x",
      maxPerTx: toAtomic(1),
      maxPerTask: toAtomic(1),
      asset: "usdc",
      merchantWhitelist: ["0x71C7656EC7ab88b098defB751B7401B5f6d8976F"],
      allowedContracts: [tokenFor("eip155:31337", "usdc")],
      validUntil: 1,
      maxPaysPerMerchant: 1,
    },
    requirement: runExactA2A(emptyState()).ok
      ? runExactA2A(emptyState()).requirement
      : {
          scheme: "exact",
          network: "eip155:31337",
          asset: "usdc",
          payTo: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          token: tokenFor("eip155:31337", "usdc"),
          amountAtomic: toAtomic(0.05),
          resource: "/",
          description: "",
        },
    spend: emptySpend(),
    now: Date.now(),
  });
  check("reject expired session key", expired.ok === false, expired.ok ? "expired allowed" : expired.reason);

  const authorizedState = seedDemo(emptyState());
  const requirement = sellerRequirement(authorizedState);
  const buyer = authorizedState.agents.find((agent) => agent.role === "buyer")!;
  const now = Math.floor(Date.now() / 1000);
  const baseProof: PaymentProof = {
    txHash: deterministicDemoTxHash("nonce-1", "payment-1"),
    agentId: buyer.id,
    taskId: "task-1",
    paymentIdentifier: "payment-1",
    nonce: "nonce-1",
    validAfter: now - 5,
    validBefore: now + 60,
    payer: buyer.wallet,
    payTo: requirement.payTo,
    token: requirement.token,
    amountAtomic: requirement.amountAtomic,
    asset: requirement.asset,
    network: requirement.network,
  };
  const authorizedReceipt = simulateReceipt({
    token: baseProof.token,
    from: baseProof.payer,
    to: baseProof.payTo,
    amountAtomic: baseProof.amountAtomic,
    txHash: baseProof.txHash,
  });
  const authorized = settleAuthorizedPayment({
    state: authorizedState,
    requirement,
    proof: baseProof,
    receipt: authorizedReceipt,
  });
  check("authorized payment settles", authorized.ok, authorized.ok ? authorized.entry.txHash : authorized.reason);

  const replay = settleAuthorizedPayment({
    state: authorizedState,
    requirement,
    proof: baseProof,
    receipt: authorizedReceipt,
  });
  check("reject nonce replay", !replay.ok, replay.ok ? "replay accepted" : replay.reason);

  const wrongPayerState = seedDemo(emptyState());
  const wrongPayerProof: PaymentProof = {
    ...baseProof,
    txHash: deterministicDemoTxHash("nonce-2", "payment-2"),
    nonce: "nonce-2",
    paymentIdentifier: "payment-2",
    payer: "0x000000000000000000000000000000000000dEaD",
  };
  const wrongPayer = settleAuthorizedPayment({
    state: wrongPayerState,
    requirement: sellerRequirement(wrongPayerState),
    proof: wrongPayerProof,
    receipt: simulateReceipt({
      token: wrongPayerProof.token,
      from: wrongPayerProof.payer,
      to: wrongPayerProof.payTo,
      amountAtomic: wrongPayerProof.amountAtomic,
      txHash: wrongPayerProof.txHash,
    }),
  });
  check("reject wrong payer", !wrongPayer.ok, wrongPayer.ok ? "wrong payer accepted" : wrongPayer.reason);

  return results;
}
