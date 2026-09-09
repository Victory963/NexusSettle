import type { NexusAsset, NexusNetwork, NexusProtocol, NexusScheme, PaymentIntent } from "./types";

const PROTOCOLS = new Set<NexusProtocol>(["x402", "ap2", "acp", "visa", "mastercard"]);
const SCHEMES = new Set<NexusScheme>(["exact", "upto", "batch-settlement", "outcome-escrow"]);
const ASSETS = new Set<NexusAsset>(["USDC", "USDT", "USD", "JPY"]);

export class IntentReject extends Error {}

type CommonFields = {
  payerAgentId: string;
  payeeAgentId: string;
  asset: NexusAsset;
  amountAtomic: string;
  network: NexusNetwork;
  nonce: string;
  resource: string;
  scheme?: NexusScheme;
};

function rejectLlmShaped(input: Record<string, unknown>) {
  for (const key of ["to_address", "amount", "privateKey", "destination", "payTo"]) {
    if (key in input) {
      throw new IntentReject(`LLM-shaped field ${key} is forbidden on PaymentIntent construction`);
    }
  }
}

function requirePositiveAtomic(amountAtomic: string) {
  try {
    const amount = BigInt(amountAtomic);
    if (amount <= 0n) throw new IntentReject("amount must be a positive integer string");
    return amount;
  } catch (error) {
    if (error instanceof IntentReject) throw error;
    throw new IntentReject("amount must be a positive integer string");
  }
}

function normalize(input: CommonFields & { protocol: NexusProtocol; source: PaymentIntent["source"] }): PaymentIntent {
  if (!PROTOCOLS.has(input.protocol)) throw new IntentReject("unknown protocol");
  const scheme = input.scheme ?? "exact";
  if (!SCHEMES.has(scheme)) throw new IntentReject("unknown scheme");
  if (!ASSETS.has(input.asset)) throw new IntentReject("unknown asset");
  if (!input.payerAgentId || !input.payeeAgentId) throw new IntentReject("payer and payee are required");
  if (input.payerAgentId === input.payeeAgentId) throw new IntentReject("self-payment is forbidden");
  if (!input.nonce || !input.resource) throw new IntentReject("nonce and resource are required");
  requirePositiveAtomic(input.amountAtomic);
  return {
    id: crypto.randomUUID(),
    protocol: input.protocol,
    scheme,
    payerAgentId: input.payerAgentId,
    payeeAgentId: input.payeeAgentId,
    asset: input.asset,
    amountAtomic: input.amountAtomic,
    network: input.network,
    nonce: input.nonce,
    resource: input.resource,
    source: input.source,
  };
}

export function paymentIntentFromX402(input: CommonFields & Record<string, unknown>): PaymentIntent {
  rejectLlmShaped(input);
  if (input.asset !== "USDC" && input.asset !== "USDT") {
    throw new IntentReject("x402 accepts only USDC or USDT");
  }
  if (!input.network.startsWith("eip155:")) {
    throw new IntentReject("x402 requires a CAIP-2 EVM network");
  }
  return normalize({ ...input, protocol: "x402", source: "x402" });
}

export function paymentIntentFromAp2Mandate(input: CommonFields & Record<string, unknown>): PaymentIntent {
  rejectLlmShaped(input);
  return normalize({ ...input, protocol: "ap2", source: "ap2-mandate" });
}

export function paymentIntentFromAcpSpt(input: CommonFields & Record<string, unknown>): PaymentIntent {
  rejectLlmShaped(input);
  if (input.asset !== "USD") throw new IntentReject("ACP shared payment tokens settle in USD");
  return normalize({ ...input, protocol: "acp", source: "acp-spt", network: "fiat:usd" });
}

export function paymentIntentFromCardQuote(
  input: CommonFields & { partner: "visa" | "mastercard" } & Record<string, unknown>,
): PaymentIntent {
  rejectLlmShaped(input);
  if (input.asset !== "USD" && input.asset !== "JPY") {
    throw new IntentReject("card rails accept only fiat USD or JPY");
  }
  return normalize({
    ...input,
    protocol: input.partner,
    source: "card-quote",
    network: input.asset === "JPY" ? "fiat:jpy" : "fiat:usd",
  });
}
