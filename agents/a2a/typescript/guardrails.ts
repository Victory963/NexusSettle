/**
 * Deterministic payment sandbox. The model only ever receives a URL.
 * Payee, amount, and token are taken from HTTP 402 headers, never from LLM arguments.
 */
export type Requirement = {
  payTo: string;
  amountAtomic: bigint;
  asset: "usdc" | "usdt";
  token: string;
  network: string;
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

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function parse402(headers: Headers): Requirement | null {
  const payTo = headers.get("x-402-pay-to");
  const amount = headers.get("x-402-amount-token");
  const asset = (headers.get("x-402-asset-id") || "usdc").toLowerCase();
  const token = headers.get("x-402-token") || "";
  const network = headers.get("x-402-network") || "";
  if (!payTo || !amount) return null;
  return {
    payTo,
    amountAtomic: BigInt(amount),
    asset: asset === "usdt" ? "usdt" : "usdc",
    token,
    network,
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

export async function fetchPaid(url: string, policy: SessionKeyPolicy, spend: SpendState, pay: (req: Requirement) => Promise<string>) {
  const first = await fetch(url);
  if (first.status === 200) return await first.json();
  if (first.status !== 402) throw new Error(`HTTP ${first.status}`);
  const req = parse402(first.headers);
  if (!req) throw new Error("Malformed 402");
  const blocked = assertPolicy(policy, req, spend);
  if (blocked) throw new Error(blocked);
  const txHash = await pay(req);
  spend.spent += req.amountAtomic;
  spend.pays.set(req.payTo.toLowerCase(), (spend.pays.get(req.payTo.toLowerCase()) ?? 0) + 1);
  const retry = await fetch(url, { headers: { "X-402-Tx-Hash": txHash } });
  if (!retry.ok) throw new Error(`Paid retry failed: ${retry.status} ${await retry.text()}`);
  return await retry.json();
}
