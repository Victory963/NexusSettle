export type StableAsset = "usdc" | "usdt";
export type NetworkId =
  | "eip155:31337"
  | "eip155:84532"
  | "eip155:2201"
  | "eip155:8453"
  | "eip155:10143"
  | "eip155:143";
export type PaymentScheme = "exact" | "upto" | "batch-settlement" | "outcome-escrow";
export type AgentRole = "buyer" | "seller" | "facilitator";
export type ClearingMode = "demo" | "testnet" | "mainnet";

export type HexAddress = `0x${string}`;
export type TxHash = `0x${string}`;

export type AgentCredential = {
  id: string;
  displayName: string;
  role: AgentRole;
  ownerDid: string;
  wallet: HexAddress;
  createdAt: number;
  reputation: number;
};

export type SessionPolicy = {
  agentId: string;
  maxPerTx: string;
  maxPerTask: string;
  asset: StableAsset;
  merchantWhitelist: HexAddress[];
  allowedContracts: HexAddress[];
  validUntil: number;
  maxPaysPerMerchant: number;
};

export type PaymentRequirement = {
  scheme: PaymentScheme;
  network: NetworkId;
  asset: StableAsset;
  payTo: HexAddress;
  token: HexAddress;
  amountAtomic: string;
  resource: string;
  description: string;
};

export type PaymentProof = {
  txHash: TxHash;
  agentId: string;
  taskId: string;
  paymentIdentifier: string;
  nonce: string;
  validAfter: number;
  validBefore: number;
  payer: HexAddress;
  payTo: HexAddress;
  token: HexAddress;
  amountAtomic: string;
  asset: StableAsset;
  network: NetworkId;
};

export type EvmLog = {
  address: HexAddress;
  topics: string[];
  data: string;
};

export type EvmReceipt = {
  transactionHash: TxHash;
  status: 0 | 1;
  logs: EvmLog[];
};

export type LedgerEntry = {
  id: string;
  at: number;
  kind: "transfer" | "escrow_lock" | "escrow_release" | "escrow_refund" | "batch_settle";
  fromAgentId: string;
  toAgentId: string;
  asset: StableAsset;
  amountAtomic: string;
  txHash: TxHash;
  resource: string;
  note: string;
  taskId?: string;
  paymentIdentifier?: string;
};

export type EscrowDeal = {
  id: string;
  buyerId: string;
  sellerId: string;
  asset: StableAsset;
  amountAtomic: string;
  predicateHash: string;
  status: "locked" | "released" | "refunded";
  createdAt: number;
  settledAt?: number;
};

export type ClearingSnapshot = {
  agents: AgentCredential[];
  policies: SessionPolicy[];
  consumedTx: TxHash[];
  consumedNonces: string[];
  consumedPaymentIdentifiers: string[];
  ledger: LedgerEntry[];
  escrows: EscrowDeal[];
  batchVouchers: BatchVoucher[];
};

export type BatchVoucher = {
  id: string;
  buyerId: string;
  sellerId: string;
  asset: StableAsset;
  amountAtomic: string;
  settled: boolean;
};

export type GuardrailDecision =
  | { ok: true }
  | { ok: false; reason: string };

export type IntelPayload = {
  alpha: string;
  verifiedBy?: TxHash;
};
