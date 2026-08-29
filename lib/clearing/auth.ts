import { createHash, createHmac, timingSafeEqual } from "crypto";
import { sameAddr } from "./assets";
import type { HexAddress } from "./types";

export const AUTH_HEADERS = {
  agentId: "X-Lumen-Agent-Id",
  timestamp: "X-Lumen-Timestamp",
  nonce: "X-Lumen-Auth-Nonce",
  authorization: "Authorization",
} as const;

export type AgentAuth = {
  agentId: string;
  nonce: string;
  timestamp: number;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalRequest(input: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
}) {
  return [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    sha256(input.body),
  ].join("\n");
}

export function signAgentRequest(input: {
  secret: string;
  agentId: string;
  method: string;
  url: string;
  body?: string;
  timestamp?: number;
  nonce?: string;
}): Record<string, string> {
  const timestamp = String(input.timestamp ?? Date.now());
  const nonce = input.nonce ?? crypto.randomUUID();
  const url = new URL(input.url);
  const canonical = canonicalRequest({
    method: input.method,
    path: `${url.pathname}${url.search}`,
    timestamp,
    nonce,
    body: input.body ?? "",
  });
  const signature = createHmac("sha256", input.secret).update(canonical).digest("hex");
  return {
    [AUTH_HEADERS.agentId]: input.agentId,
    [AUTH_HEADERS.timestamp]: timestamp,
    [AUTH_HEADERS.nonce]: nonce,
    [AUTH_HEADERS.authorization]: `Lumen-HMAC ${signature}`,
  };
}

export function verifyAgentRequest(input: {
  request: Request;
  secret: string;
  expectedAgentId?: string;
  expectedWallet?: HexAddress;
  paymentPayer?: HexAddress;
  body?: string;
  now?: number;
}): { ok: true; auth: AgentAuth } | { ok: false; status: number; reason: string } {
  const agentId = input.request.headers.get(AUTH_HEADERS.agentId) ?? "";
  const timestamp = input.request.headers.get(AUTH_HEADERS.timestamp) ?? "";
  const nonce = input.request.headers.get(AUTH_HEADERS.nonce) ?? "";
  const authorization = input.request.headers.get(AUTH_HEADERS.authorization) ?? "";
  const supplied = authorization.startsWith("Lumen-HMAC ") ? authorization.slice(11) : "";
  if (!agentId || !timestamp || !nonce || !supplied) {
    return { ok: false, status: 401, reason: "Missing agent request signature" };
  }
  if (input.expectedAgentId && agentId !== input.expectedAgentId) {
    return { ok: false, status: 403, reason: "Agent identity is not allowed" };
  }
  if (input.expectedWallet && input.paymentPayer && !sameAddr(input.expectedWallet, input.paymentPayer)) {
    return { ok: false, status: 403, reason: "Payment payer is not bound to the authenticated agent" };
  }
  const parsedTimestamp = Number(timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(parsedTimestamp) || Math.abs(now - parsedTimestamp) > 5 * 60 * 1000) {
    return { ok: false, status: 401, reason: "Agent request signature expired" };
  }
  const url = new URL(input.request.url);
  const expected = createHmac("sha256", input.secret)
    .update(
      canonicalRequest({
        method: input.request.method,
        path: `${url.pathname}${url.search}`,
        timestamp,
        nonce,
        body: input.body ?? "",
      }),
    )
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(supplied, "hex");
  } catch {
    return { ok: false, status: 401, reason: "Malformed agent request signature" };
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, status: 401, reason: "Invalid agent request signature" };
  }
  return { ok: true, auth: { agentId, nonce, timestamp: parsedTimestamp } };
}
