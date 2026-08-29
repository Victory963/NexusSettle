import { sameAddr } from "./assets";
import type { HexAddress, NetworkId, PaymentProof, PaymentRequirement, TxHash } from "./types";

export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";

export type X402ResourceInfo = {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
};

export type X402PaymentRequirements = {
  scheme: string;
  network: NetworkId;
  amount: string;
  asset: HexAddress;
  payTo: HexAddress;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
};

export type X402PaymentRequired = {
  x402Version: 2;
  error?: string;
  resource: X402ResourceInfo;
  accepts: X402PaymentRequirements[];
  extensions: Record<string, unknown>;
};

export type X402Authorization = {
  from: HexAddress;
  to: HexAddress;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
};

export type X402PaymentPayload = {
  x402Version: 2;
  resource?: X402ResourceInfo;
  accepted: X402PaymentRequirements;
  payload: {
    signature: string;
    authorization: X402Authorization;
  };
  extensions: Record<string, unknown>;
};

export type X402SettlementResponse = {
  success: boolean;
  transaction: TxHash;
  network: NetworkId;
  payer: HexAddress;
  errorReason?: string;
};

function b64(obj: unknown) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function unb64<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function toX402Requirement(req: PaymentRequirement): X402PaymentRequirements {
  return {
    scheme: req.scheme,
    network: req.network,
    amount: req.amountAtomic,
    asset: req.token,
    payTo: req.payTo,
    maxTimeoutSeconds: 60,
    extra: {
      name: req.asset.toUpperCase(),
      version: "2",
      assetTransferMethod: "eip3009",
    },
  };
}

export function paymentRequiredBody(
  req: PaymentRequirement,
  resourceUrl = req.resource,
): X402PaymentRequired {
  return {
    x402Version: 2,
    error: `${PAYMENT_SIGNATURE_HEADER} header is required`,
    resource: {
      url: resourceUrl,
      description: req.description,
      mimeType: "application/json",
      serviceName: "Lumen Clearing",
      tags: ["a2a", "stablecoin"],
    },
    accepts: [toX402Requirement(req)],
    extensions: {},
  };
}

export function encodePaymentRequired(req: PaymentRequirement, resourceUrl?: string) {
  return b64(paymentRequiredBody(req, resourceUrl));
}

export function decodePaymentRequired(header: string | null) {
  return unb64<X402PaymentRequired>(header);
}

export function encodePaymentPayload(payload: X402PaymentPayload) {
  return b64(payload);
}

export function decodePaymentPayload(header: string | null): X402PaymentPayload | null {
  const payload = unb64<X402PaymentPayload>(header);
  if (
    !payload ||
    payload.x402Version !== 2 ||
    !payload.accepted ||
    !payload.payload?.authorization ||
    !payload.payload.signature
  ) {
    return null;
  }
  return payload;
}

export function encodeSettlementResponse(response: X402SettlementResponse) {
  return b64(response);
}

export function x402Headers(
  req: PaymentRequirement,
  resourceUrl?: string,
): Record<string, string> {
  return {
    [PAYMENT_REQUIRED_HEADER]: encodePaymentRequired(req, resourceUrl),
    "Cache-Control": "no-store",
  };
}

export function settlementHeaders(response: X402SettlementResponse): Record<string, string> {
  return {
    [PAYMENT_RESPONSE_HEADER]: encodeSettlementResponse(response),
    "Cache-Control": "no-store",
  };
}

export function payloadMatchesRequirement(
  payload: X402PaymentPayload,
  req: PaymentRequirement,
): boolean {
  const accepted = payload.accepted;
  return (
    accepted.scheme === req.scheme &&
    accepted.network === req.network &&
    accepted.amount === req.amountAtomic &&
    sameAddr(accepted.asset, req.token) &&
    sameAddr(accepted.payTo, req.payTo)
  );
}

export function proofFromPaymentPayload(input: {
  payload: X402PaymentPayload;
  requirement: PaymentRequirement;
  agentId: string;
  taskId: string;
  paymentIdentifier: string;
  txHash: TxHash;
}): PaymentProof | null {
  if (!payloadMatchesRequirement(input.payload, input.requirement)) return null;
  const authorization = input.payload.payload.authorization;
  return {
    txHash: input.txHash,
    agentId: input.agentId,
    taskId: input.taskId,
    paymentIdentifier: input.paymentIdentifier,
    nonce: authorization.nonce,
    validAfter: Number(authorization.validAfter),
    validBefore: Number(authorization.validBefore),
    payer: authorization.from,
    payTo: authorization.to,
    token: input.payload.accepted.asset,
    amountAtomic: authorization.value,
    asset: input.requirement.asset,
    network: input.requirement.network,
  };
}
