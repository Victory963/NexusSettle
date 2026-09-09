export type NexusAsset = "USDC" | "USDT" | "USD" | "JPY";
export type NexusProtocol = "x402" | "ap2" | "acp" | "visa" | "mastercard";
export type NexusScheme = "exact" | "upto" | "batch-settlement" | "outcome-escrow";
export type AccountKind = "user" | "platform_clearing" | "fees" | "card_suspense" | "fx_suspense";

/** CAIP-2 for EVM; `fiat:usd` / `fiat:jpy` for card/off-ramp legs. */
export type NexusNetwork = `eip155:${number}` | "fiat:usd" | "fiat:jpy";

export type PaymentIntent = {
  id: string;
  protocol: NexusProtocol;
  scheme: NexusScheme;
  payerAgentId: string;
  payeeAgentId: string;
  asset: NexusAsset;
  amountAtomic: string;
  network: NexusNetwork;
  nonce: string;
  resource: string;
  source: "x402" | "ap2-mandate" | "acp-spt" | "card-quote";
};

export type IntentContext = {
  allowedAssets: NexusAsset[];
  allowedPayees: string[];
  perTxLimit: bigint;
  dailyLimit: bigint;
  spentToday: bigint;
  consumedNonces: Set<string>;
  eip3009: boolean;
  sanctionsScore: number;
  now?: number;
};

export type GuardrailResult =
  | { ok: true }
  | { ok: false; reason: string };

export type JournalAccount = {
  id: string;
  agentId: string;
  asset: NexusAsset;
  network: NexusNetwork;
  kind: AccountKind;
  balance: bigint;
  version: number;
};

export type JournalEntry = {
  id: string;
  extRef: string;
  memo: string;
  createdAt: number;
};

export type JournalPosting = {
  id: string;
  entryId: string;
  accountId: string;
  asset: NexusAsset;
  amount: bigint;
};

export type BilateralObligation = {
  debtor: string;
  creditor: string;
  amount: bigint;
};

export type SettlementInstruction = {
  from: string;
  to: string;
  amount: bigint;
};

export type FxQuote = {
  fromAsset: NexusAsset;
  toAsset: NexusAsset;
  fromAmountAtomic: string;
  toAmountAtomic: string;
  rate: string;
  spreadBps: number;
  depegHalt: boolean;
  partnerRequired: boolean;
  executable: false;
};

export type CardInstruction = {
  partner: "visa-tap" | "mastercard-agent-pay" | "acp-spt";
  status: "paper" | "blocked";
  reason: string;
  quote: FxQuote;
  merchantRef: string;
  containsPan: false;
};
