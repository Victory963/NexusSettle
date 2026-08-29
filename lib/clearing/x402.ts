import type { PaymentProof, PaymentRequirement } from "./types";

export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";

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

export function encodePaymentRequired(req: PaymentRequirement) {
  return b64(req);
}

export function decodePaymentRequired(header: string | null) {
  return unb64<PaymentRequirement>(header);
}

export function encodePaymentProof(proof: PaymentProof) {
  return b64(proof);
}

export function decodePaymentProof(header: string | null) {
  return unb64<PaymentProof>(header);
}

export function x402Headers(req: PaymentRequirement): Record<string, string> {
  return {
    [PAYMENT_REQUIRED_HEADER]: encodePaymentRequired(req),
    "X-402-Pay-To": req.payTo,
    "X-402-Amount-Token": req.amountAtomic,
    "X-402-Asset-Id": req.asset,
    "X-402-Network": req.network,
    "X-402-Token": req.token,
    "X-402-Scheme": req.scheme,
  };
}

export function paymentRequiredBody(req: PaymentRequirement) {
  return {
    error: "Payment Required",
    x402Version: 2,
    accepts: [req],
  };
}
