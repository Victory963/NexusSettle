/** Deterministic policy sandbox for the credential-free demo rail only. */
type AcceptedPayment = {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
};

export type Requirement = {
  payTo: string;
  amountAtomic: bigint;
  asset: "usdc" | "usdt";
  token: string;
  network: string;
  accepted: AcceptedPayment;
};

export type SessionKeyPolicy = {
  maxPerTx: bigint;
  maxPerTask: bigint;
  asset: "usdc" | "usdt";
  merchantWhitelist: string[];
  allowedContracts: string[];
  validUntil: number;
  maxPaysPerMerchant: number;
};

export type SpendState = { spent: bigint; pays: Map<string, number> };
export type DemoAuthorization = {
  signature: string;
  from: `0x${string}`;
  nonce: string;
  validAfter: string;
  validBefore: string;
};

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function parse402(headers: Headers): Requirement | null {
  const encoded = headers.get("PAYMENT-REQUIRED");
  if (!encoded) return null;
  let accepted: AcceptedPayment;
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    accepted = decoded.accepts?.[0] as AcceptedPayment;
  } catch {
    return null;
  }
  if (!accepted?.payTo || !accepted.amount || !accepted.asset || !accepted.network) return null;
  const name = String(accepted.extra?.name ?? "USDC").toLowerCase();
  return {
    payTo: accepted.payTo,
    amountAtomic: BigInt(accepted.amount),
    asset: name === "usdt" ? "usdt" : "usdc",
    token: accepted.asset,
    network: accepted.network,
    accepted,
  };
}

export function assertPolicy(policy: SessionKeyPolicy, req: Requirement, spend: SpendState, now = Date.now()): string | null {
  if (now > policy.validUntil) return "Session key expired";
  if (req.asset !== policy.asset) return "Asset not permitted";
  if (!policy.merchantWhitelist.some((a) => eq(a, req.payTo))) return "Payee not whitelisted";
  if (req.token && !policy.allowedContracts.some((a) => eq(a, req.token))) return "Unknown token contract";
  if (req.amountAtomic > policy.maxPerTx) return "Exceeds per-tx cap";
  if (spend.spent + req.amountAtomic > policy.maxPerTask) return "Task budget exceeded";
  const n = spend.pays.get(req.payTo.toLowerCase()) ?? 0;
  if (n >= policy.maxPaysPerMerchant) return "Merchant already paid in this task";
  return null;
}

export async function fetchDemoPaid(
  url: string,
  policy: SessionKeyPolicy,
  spend: SpendState,
  authorize: (req: Requirement) => Promise<DemoAuthorization>,
) {
  if (!new URL(url).pathname.startsWith("/api/clearing/demo/")) {
    throw new Error("Synthetic authorization is restricted to the explicit demo route");
  }
  const first = await fetch(url);
  if (first.status === 200) return await first.json();
  if (first.status !== 402) throw new Error(`HTTP ${first.status}`);
  const req = parse402(first.headers);
  if (!req) throw new Error("Malformed 402");
  const blocked = assertPolicy(policy, req, spend);
  if (blocked) throw new Error(blocked);
  const authorization = await authorize(req);
  const paymentIdentifier = crypto.randomUUID();
  const payload = {
    x402Version: 2,
    accepted: req.accepted,
    payload: {
      signature: authorization.signature,
      authorization: {
        from: authorization.from,
        to: req.payTo,
        value: req.amountAtomic.toString(),
        validAfter: authorization.validAfter,
        validBefore: authorization.validBefore,
        nonce: authorization.nonce,
      },
    },
    extensions: {},
  };
  const retry = await fetch(url, {
    headers: {
      "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
      "X-Lumen-Agent-Id": "agent-buyer-research",
      "X-Lumen-Task-Id": crypto.randomUUID(),
      "Payment-Identifier": paymentIdentifier,
    },
  });
  if (!retry.ok) throw new Error(`Paid retry failed: ${retry.status} ${await retry.text()}`);
  spend.spent += req.amountAtomic;
  spend.pays.set(req.payTo.toLowerCase(), (spend.pays.get(req.payTo.toLowerCase()) ?? 0) + 1);
  return await retry.json();
}
