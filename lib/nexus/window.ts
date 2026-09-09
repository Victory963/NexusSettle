import { issueCardInstruction, quoteCardOfframp } from "./card-rail";
import { authorizeIntent } from "./guardrail";
import { paymentIntentFromCardQuote, paymentIntentFromX402 } from "./intent";
import { emptyBook, fundAccount, postTransfer, type LedgerBook } from "./journal";
import { multilateralNet, serializeNet, settlementInstructions } from "./netting";
import type { BilateralObligation, CardInstruction, FxQuote, IntentContext, PaymentIntent } from "./types";

const NETWORK = "eip155:31337" as const;
const ASSET = "USDC" as const;

export const NEXUS_DEMO_AGENTS = {
  buyer: "agent-buyer-research",
  intel: "agent-seller-intel",
  compute: "agent-seller-compute",
} as const;

function context(overrides: Partial<IntentContext> = {}): IntentContext {
  return {
    allowedAssets: ["USDC", "USDT", "USD"],
    allowedPayees: [NEXUS_DEMO_AGENTS.intel, NEXUS_DEMO_AGENTS.compute, NEXUS_DEMO_AGENTS.buyer],
    perTxLimit: 500_000n,
    dailyLimit: 5_000_000n,
    spentToday: 0n,
    consumedNonces: new Set(),
    eip3009: true,
    sanctionsScore: 0,
    ...overrides,
  };
}

function pricedObligation(
  debtor: string,
  creditor: string,
  amount: bigint,
  nonce: string,
  ctx: IntentContext,
): { obligation: BilateralObligation; intent: PaymentIntent } {
  const intent = paymentIntentFromX402({
    payerAgentId: debtor,
    payeeAgentId: creditor,
    asset: ASSET,
    amountAtomic: amount.toString(),
    network: NETWORK,
    nonce,
    resource: "/api/clearing/demo/nexus/window",
  });
  const gate = authorizeIntent(intent, ctx);
  if (!gate.ok) throw new Error(gate.reason);
  ctx.consumedNonces.add(intent.nonce);
  ctx.spentToday += amount;
  return { obligation: { debtor, creditor, amount }, intent };
}

export type NexusWindowResult = {
  scheme: "multilateral-net";
  obligations: Array<{ debtor: string; creditor: string; amount: string }>;
  net: Record<string, string>;
  instructions: Array<{ from: string; to: string; amount: string }>;
  onChainTransfers: number;
  naiveOnChainTransfers: number;
  journalEntries: number;
  card: { quote: FxQuote; instruction: CardInstruction };
  balances: Record<string, string>;
};

export function runNexusWindow(book: LedgerBook = emptyBook()): NexusWindowResult {
  fundAccount(book, NEXUS_DEMO_AGENTS.buyer, ASSET, NETWORK, 1_000_000n);
  fundAccount(book, NEXUS_DEMO_AGENTS.intel, ASSET, NETWORK, 200_000n);
  fundAccount(book, NEXUS_DEMO_AGENTS.compute, ASSET, NETWORK, 200_000n);

  const ctx = context();
  const priced = [
    pricedObligation(NEXUS_DEMO_AGENTS.buyer, NEXUS_DEMO_AGENTS.intel, 50_000n, "nonce-intel", ctx),
    pricedObligation(NEXUS_DEMO_AGENTS.buyer, NEXUS_DEMO_AGENTS.compute, 80_000n, "nonce-compute", ctx),
    pricedObligation(NEXUS_DEMO_AGENTS.intel, NEXUS_DEMO_AGENTS.compute, 20_000n, "nonce-subcontract", ctx),
    pricedObligation(NEXUS_DEMO_AGENTS.compute, NEXUS_DEMO_AGENTS.intel, 10_000n, "nonce-buyback", ctx),
  ];

  for (const row of priced) {
    postTransfer({
      book,
      extRef: row.intent.nonce,
      payer: row.obligation.debtor,
      payee: row.obligation.creditor,
      asset: ASSET,
      network: NETWORK,
      amount: row.obligation.amount,
      memo: `off-chain A2A ${row.intent.id}`,
    });
  }

  const net = multilateralNet(priced.map((row) => row.obligation));
  const instructions = settlementInstructions(net);
  const intelNet = net.get(NEXUS_DEMO_AGENTS.intel) ?? 0n;
  const quote = quoteCardOfframp(intelNet > 0n ? intelNet.toString() : "1");
  const cardIntent = paymentIntentFromCardQuote({
    payerAgentId: NEXUS_DEMO_AGENTS.intel,
    payeeAgentId: "card-merchant-treasury",
    asset: "USD",
    amountAtomic: quote.toAmountAtomic,
    network: "fiat:usd",
    nonce: "nonce-card-offramp",
    resource: "visa://paper-offramp",
    partner: "visa",
  });

  return {
    scheme: "multilateral-net",
    obligations: priced.map((row) => ({
      debtor: row.obligation.debtor,
      creditor: row.obligation.creditor,
      amount: row.obligation.amount.toString(),
    })),
    net: serializeNet(net),
    instructions: instructions.map((row) => ({
      from: row.from,
      to: row.to,
      amount: row.amount.toString(),
    })),
    onChainTransfers: instructions.length,
    naiveOnChainTransfers: priced.length,
    journalEntries: book.entries.length,
    card: {
      quote,
      instruction: issueCardInstruction({ intent: cardIntent, quote, partner: "visa-tap" }),
    },
    balances: Object.fromEntries(
      [...book.accounts.values()]
        .filter((account) => account.kind === "user")
        .map((account) => [account.agentId, account.balance.toString()]),
    ),
  };
}
