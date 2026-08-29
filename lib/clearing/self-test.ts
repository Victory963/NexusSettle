import { tokenFor, toAtomic } from "./assets";
import { verifyStableTransfer } from "./erc20";
import { emptyState, rejectFakeToken, rejectPromptInjectionPayee, runExactA2A, runOutcomeA2A, simulateReceipt } from "./orchestrator";
import { emptySpend, evaluatePolicy } from "./policy";

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
      token: tokenFor("simulated", "usdc"),
      from: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      amountAtomic: toAtomic(0.01),
    }),
    {
      payTo: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      token: tokenFor("simulated", "usdc"),
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
      allowedContracts: [tokenFor("simulated", "usdc")],
      validUntil: 1,
      maxPaysPerMerchant: 1,
    },
    requirement: runExactA2A(emptyState()).ok
      ? runExactA2A(emptyState()).requirement
      : {
          scheme: "exact",
          network: "simulated",
          asset: "usdc",
          payTo: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          token: tokenFor("simulated", "usdc"),
          amountAtomic: toAtomic(0.05),
          resource: "/",
          description: "",
        },
    spend: emptySpend(),
    now: Date.now(),
  });
  check("reject expired session key", expired.ok === false, expired.ok ? "expired allowed" : expired.reason);

  return results;
}
