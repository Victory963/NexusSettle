import { createHash } from "crypto";

export type MainnetGateResult =
  | { ok: true; summary: Record<string, string> }
  | { ok: false; reasons: string[] };

const PUBLIC_FACILITATOR = "x402.org";

export function hashMainnetSummary(summary: Record<string, string>) {
  const canonical = Object.keys(summary)
    .sort()
    .map((key) => `${key}=${summary[key]}`)
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function evaluateMainnetGate(env: NodeJS.ProcessEnv = process.env): MainnetGateResult {
  const reasons: string[] = [];
  if (env.CLEARING_MODE !== "mainnet") reasons.push("CLEARING_MODE must be mainnet");
  if (env.CLEARING_MAINNET_ENABLED !== "true") {
    reasons.push("CLEARING_MAINNET_ENABLED is false until dual approval and preflight succeed");
  }
  if (env.CLEARING_KILL_SWITCH === "true") reasons.push("CLEARING_KILL_SWITCH is engaged");

  const facilitator = env.X402_FACILITATOR_URL ?? "";
  if (!facilitator.startsWith("https://")) reasons.push("Production facilitator URL must use HTTPS");
  if (!facilitator || facilitator.includes(PUBLIC_FACILITATOR)) {
    reasons.push("Public x402.org facilitator is forbidden on mainnet");
  }

  if (!env.DATABASE_URL?.startsWith("postgres")) reasons.push("PostgreSQL DATABASE_URL is required");
  if (!env.CLEARING_MERCHANT_ADDRESS || /^0x0{40}$/i.test(env.CLEARING_MERCHANT_ADDRESS)) {
    reasons.push("CLEARING_MERCHANT_ADDRESS must be a live merchant wallet");
  }
  if (!env.CLEARING_AGENT_WALLET || /^0x0{40}$/i.test(env.CLEARING_AGENT_WALLET)) {
    reasons.push("CLEARING_AGENT_WALLET must match the CDP/TEE-hosted signer");
  }
  if ((env.AGENT_HMAC_SECRET ?? "").length < 32) reasons.push("AGENT_HMAC_SECRET is too short");

  const approverA = env.MAINNET_APPROVER_A?.trim() ?? "";
  const approverB = env.MAINNET_APPROVER_B?.trim() ?? "";
  if (!approverA || !approverB || approverA === approverB) {
    reasons.push("Two distinct MAINNET_APPROVER_A / MAINNET_APPROVER_B identities are required");
  }

  const dailyCap = Number(env.CLEARING_DAILY_CAP_ATOMIC ?? "0");
  const canary = Number(env.CLEARING_CANARY_MAX_ATOMIC ?? "0");
  if (!Number.isFinite(dailyCap) || dailyCap <= 0) reasons.push("CLEARING_DAILY_CAP_ATOMIC must be > 0");
  if (!Number.isFinite(canary) || canary <= 0 || canary > dailyCap) {
    reasons.push("CLEARING_CANARY_MAX_ATOMIC must be > 0 and <= daily cap");
  }

  const usdtFacilitator = env.X402_USDT_FACILITATOR_URL ?? "";
  if (usdtFacilitator && (!usdtFacilitator.startsWith("https://") || usdtFacilitator.includes(PUBLIC_FACILITATOR))) {
    reasons.push("USDT mainnet requires a production facilitator that advertises Permit2 for the canonical token");
  }

  const summary = {
    network: "eip155:8453",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    facilitator,
    merchant: env.CLEARING_MERCHANT_ADDRESS ?? "",
    agentWallet: env.CLEARING_AGENT_WALLET ?? "",
    dailyCap: String(dailyCap),
    canary: String(canary),
    approverA,
    approverB,
    kybAttestation: env.MAINNET_KYB_ATTESTATION_ID ?? "",
  };
  const expectedHash = hashMainnetSummary(summary);
  if (!env.MAINNET_PREFLIGHT_HASH || env.MAINNET_PREFLIGHT_HASH !== expectedHash) {
    reasons.push("MAINNET_PREFLIGHT_HASH does not match npm run preflight:mainnet output");
  }
  if (!env.MAINNET_KYB_ATTESTATION_ID) {
    reasons.push("MAINNET_KYB_ATTESTATION_ID is required; code does not replace a license or audit");
  }

  if (reasons.length) return { ok: false, reasons };
  return { ok: true, summary };
}
