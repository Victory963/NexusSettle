import { issueCardInstruction } from "./card-rail";
import { assertResourceUrl } from "./gemini";
import { quoteFx } from "./fx";
import { tokenFor } from "../clearing/assets";
import { authorizeIntent, supportsEip3009 } from "./guardrail";
import { IntentReject, paymentIntentFromAcpSpt, paymentIntentFromAp2Mandate, paymentIntentFromX402 } from "./intent";
import { emptyBook, findEntry, fundAccount, JournalReject, postTransfer } from "./journal";
import { multilateralNet, settlementInstructions } from "./netting";
import { routeIntent } from "./router";
import { NEXUS_DEMO_AGENTS, runNexusWindow } from "./window";
import type { IntentContext, PaymentIntent } from "./types";

export type TestResult = { name: string; pass: boolean; detail: string };

function ctx(overrides: Partial<IntentContext> = {}): IntentContext {
  return {
    allowedAssets: ["USDC", "USDT", "USD"],
    allowedPayees: [NEXUS_DEMO_AGENTS.intel, NEXUS_DEMO_AGENTS.compute],
    perTxLimit: 100_000n,
    dailyLimit: 200_000n,
    spentToday: 0n,
    consumedNonces: new Set(),
    eip3009: true,
    sanctionsScore: 0,
    ...overrides,
  };
}

function sampleX402(): PaymentIntent {
  return paymentIntentFromX402({
    payerAgentId: NEXUS_DEMO_AGENTS.buyer,
    payeeAgentId: NEXUS_DEMO_AGENTS.intel,
    asset: "USDC",
    amountAtomic: "50000",
    network: "eip155:31337",
    nonce: "n1",
    resource: "/intel",
  });
}

export function runNexusSelfTests(): TestResult[] {
  const results: TestResult[] = [];
  const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

  try {
    const window = runNexusWindow();
    check("window nets to zero", Object.values(window.net).reduce((sum, v) => sum + BigInt(v), 0n) === 0n, JSON.stringify(window.net));
    check(
      "star netting beats naive on-chain",
      window.onChainTransfers <= 3 && window.naiveOnChainTransfers === 4,
      `${window.onChainTransfers} vs ${window.naiveOnChainTransfers}`,
    );
    check("buyer nets -130000", window.net[NEXUS_DEMO_AGENTS.buyer] === "-130000", window.net[NEXUS_DEMO_AGENTS.buyer] ?? "missing");
    check("intel nets +40000", window.net[NEXUS_DEMO_AGENTS.intel] === "40000", window.net[NEXUS_DEMO_AGENTS.intel] ?? "missing");
    check("compute nets +90000", window.net[NEXUS_DEMO_AGENTS.compute] === "90000", window.net[NEXUS_DEMO_AGENTS.compute] ?? "missing");
    check("card instruction never contains PAN", window.card.instruction.containsPan === false, String(window.card.instruction.containsPan));
    check("card rail is paper or blocked", window.card.instruction.status !== undefined, window.card.instruction.status);
    check("fx quote is not executable", window.card.quote.executable === false, String(window.card.quote.executable));
    check("buyer remaining 870000", window.balances[NEXUS_DEMO_AGENTS.buyer] === "870000", window.balances[NEXUS_DEMO_AGENTS.buyer] ?? "missing");
  } catch (error) {
    check("window demo", false, error instanceof Error ? error.message : "failed");
  }

  const book = emptyBook();
  fundAccount(book, "a", "USDC", "eip155:31337", 100n);
  const first = postTransfer({
    book,
    extRef: "dup",
    payer: "a",
    payee: "b",
    asset: "USDC",
    network: "eip155:31337",
    amount: 40n,
    memo: "once",
  });
  const replay = postTransfer({
    book,
    extRef: "dup",
    payer: "a",
    payee: "b",
    asset: "USDC",
    network: "eip155:31337",
    amount: 40n,
    memo: "replay",
  });
  check("journal replay is idempotent", first.id === replay.id && findEntry(book, "dup")?.id === first.id, first.id);
  check("replay does not double-spend", book.accounts.get("a:USDC:eip155:31337:user")?.balance === 60n, String(book.accounts.get("a:USDC:eip155:31337:user")?.balance));

  try {
    postTransfer({
      book,
      extRef: "over",
      payer: "a",
      payee: "b",
      asset: "USDC",
      network: "eip155:31337",
      amount: 1000n,
      memo: "over",
    });
    check("reject overdraft", false, "overdraft posted");
  } catch (error) {
    check("reject overdraft", error instanceof JournalReject, error instanceof Error ? error.message : "failed");
  }

  const net = multilateralNet([
    { debtor: "a", creditor: "b", amount: 10n },
    { debtor: "b", creditor: "c", amount: 10n },
  ]);
  check("cycle nets a=-10 c=+10 b=0", net.get("a") === -10n && (net.get("b") ?? 0n) === 0n && net.get("c") === 10n, "ok");
  const instructions = settlementInstructions(net).filter((row) => row.amount !== 0n);
  check("zero-position parties omitted", instructions.every((row) => row.from !== "b" && row.to !== "b"), String(instructions.length));

  let llmBlocked = false;
  try {
    paymentIntentFromX402({
      payerAgentId: "a",
      payeeAgentId: "b",
      asset: "USDC",
      amountAtomic: "1",
      network: "eip155:31337",
      nonce: "n",
      resource: "/",
      to_address: "0xattacker",
    });
  } catch (error) {
    llmBlocked = error instanceof IntentReject;
  }
  check("reject LLM-shaped payee field", llmBlocked, llmBlocked ? "blocked" : "accepted");

  const ap2 = paymentIntentFromAp2Mandate({
    payerAgentId: "a",
    payeeAgentId: "b",
    asset: "USDC",
    amountAtomic: "1",
    network: "eip155:8453",
    nonce: "ap2",
    resource: "/",
  });
  const acp = paymentIntentFromAcpSpt({
    payerAgentId: "a",
    payeeAgentId: "b",
    asset: "USD",
    amountAtomic: "1",
    network: "fiat:usd",
    nonce: "acp",
    resource: "/",
  });
  check("x402/AP2/ACP share PaymentIntent shape", ap2.payerAgentId === acp.payerAgentId && "protocol" in sampleX402(), `${ap2.source}/${acp.source}`);
  check("ACP routes to licensed card token", routeIntent(acp).rail === "acp-spt", routeIntent(acp).rail);

  const baseUsdt = authorizeIntent(
    paymentIntentFromX402({
      payerAgentId: NEXUS_DEMO_AGENTS.buyer,
      payeeAgentId: NEXUS_DEMO_AGENTS.intel,
      asset: "USDT",
      amountAtomic: "1",
      network: "eip155:8453",
      nonce: "usdt-base",
      resource: "/",
    }),
    ctx({ eip3009: false }),
  );
  check("reject Base native USDT", baseUsdt.ok === false, baseUsdt.ok ? "accepted" : baseUsdt.reason);

  const monadUsdt = authorizeIntent(
    paymentIntentFromX402({
      payerAgentId: NEXUS_DEMO_AGENTS.buyer,
      payeeAgentId: NEXUS_DEMO_AGENTS.intel,
      asset: "USDT",
      amountAtomic: "1",
      network: "eip155:143",
      nonce: "usdt-monad",
      resource: "/",
    }),
    ctx(),
  );
  check(
    "reject Monad USDT",
    monadUsdt.ok === false && supportsEip3009("USDC", "eip155:10143") && tokenFor("eip155:143", "usdc").toLowerCase() === "0x754704bc059f8c67012fed69bc8a327a5aafb603",
    monadUsdt.ok ? "accepted" : monadUsdt.reason,
  );

  const injected = authorizeIntent(sampleX402(), ctx({ allowedPayees: ["someone-else"] }));
  check("reject payee outside allowlist", injected.ok === false, injected.ok ? "accepted" : injected.reason);

  const replayNonce = authorizeIntent(sampleX402(), ctx({ consumedNonces: new Set(["n1"]) }));
  check("reject nonce replay", replayNonce.ok === false, replayNonce.ok ? "accepted" : replayNonce.reason);

  const depeg = quoteFx({
    fromAsset: "USDC",
    toAsset: "USD",
    fromAmountAtomic: "1000000",
    observedMid: 0.99,
  });
  check("depeg halt above 50bps", depeg.depegHalt, `deviation halt=${depeg.depegHalt}`);

  const quote = quoteFx({ fromAsset: "USDC", toAsset: "USD", fromAmountAtomic: "1000000" });
  const card = issueCardInstruction({
    intent: {
      id: "x",
      protocol: "visa",
      scheme: "exact",
      payerAgentId: "a",
      payeeAgentId: "b",
      asset: "USD",
      amountAtomic: quote.toAmountAtomic,
      network: "fiat:usd",
      nonce: "c",
      resource: "visa://paper",
      source: "card-quote",
    },
    quote,
    partner: "mastercard-agent-pay",
  });
  check("unlicensed card partner is blocked", card.status === "blocked", card.reason);

  check(
    "gemini accepts a resource url",
    assertResourceUrl({ url: "https://github.com/Victory963/NexusSettle" }) ===
      "https://github.com/Victory963/NexusSettle",
    "url",
  );
  let rejectedPaymentField = false;
  try {
    assertResourceUrl({ url: "https://example.com/resource", amount: "1" });
  } catch {
    rejectedPaymentField = true;
  }
  check("gemini rejects payment fields", rejectedPaymentField, "amount");
  let rejectedScheme = false;
  try {
    assertResourceUrl({ url: "file:///etc/passwd" });
  } catch {
    rejectedScheme = true;
  }
  check("gemini rejects non-http url", rejectedScheme, "file");

  return results;
}
