import { evaluateMainnetGate, hashMainnetSummary } from "../lib/clearing/mainnet-gate";

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

const locked = evaluateMainnetGate({ CLEARING_MODE: "demo" });
check("demo cannot open mainnet gate", locked.ok === false, locked.ok ? "opened" : locked.reasons[0]);

const publicFacilitator = evaluateMainnetGate({
  CLEARING_MODE: "mainnet",
  CLEARING_MAINNET_ENABLED: "true",
  X402_FACILITATOR_URL: "https://x402.org/facilitator",
  DATABASE_URL: "postgresql://lumen:lumen@127.0.0.1:5432/lumen",
  CLEARING_MERCHANT_ADDRESS: "0x1111111111111111111111111111111111111111",
  CLEARING_AGENT_WALLET: "0x2222222222222222222222222222222222222222",
  AGENT_HMAC_SECRET: "x".repeat(32),
  MAINNET_APPROVER_A: "alice",
  MAINNET_APPROVER_B: "bob",
  CLEARING_DAILY_CAP_ATOMIC: "10000000",
  CLEARING_CANARY_MAX_ATOMIC: "10000",
  MAINNET_KYB_ATTESTATION_ID: "kyb-1",
  MAINNET_PREFLIGHT_HASH: "dead",
});
check(
  "reject public facilitator",
  publicFacilitator.ok === false && publicFacilitator.reasons.some((r) => r.includes("x402.org")),
  publicFacilitator.ok ? "accepted public facilitator" : "ok",
);

const summary = {
  network: "eip155:8453",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  facilitator: "https://facilitator.example.com",
  merchant: "0x1111111111111111111111111111111111111111",
  agentWallet: "0x2222222222222222222222222222222222222222",
  dailyCap: "10000000",
  canary: "10000",
  approverA: "alice",
  approverB: "bob",
  kybAttestation: "kyb-1",
};
const allowed = evaluateMainnetGate({
  CLEARING_MODE: "mainnet",
  CLEARING_MAINNET_ENABLED: "true",
  X402_FACILITATOR_URL: summary.facilitator,
  DATABASE_URL: "postgresql://lumen:lumen@127.0.0.1:5432/lumen",
  CLEARING_MERCHANT_ADDRESS: summary.merchant,
  CLEARING_AGENT_WALLET: summary.agentWallet,
  AGENT_HMAC_SECRET: "x".repeat(32),
  MAINNET_APPROVER_A: summary.approverA,
  MAINNET_APPROVER_B: summary.approverB,
  CLEARING_DAILY_CAP_ATOMIC: summary.dailyCap,
  CLEARING_CANARY_MAX_ATOMIC: summary.canary,
  MAINNET_KYB_ATTESTATION_ID: summary.kybAttestation,
  MAINNET_PREFLIGHT_HASH: hashMainnetSummary(summary),
});
check("approve complete preflight", allowed.ok, allowed.ok ? "open" : allowed.reasons.join("; "));

const killed = evaluateMainnetGate({
  CLEARING_MODE: "mainnet",
  CLEARING_MAINNET_ENABLED: "true",
  CLEARING_KILL_SWITCH: "true",
  X402_FACILITATOR_URL: summary.facilitator,
  DATABASE_URL: "postgresql://lumen:lumen@127.0.0.1:5432/lumen",
  CLEARING_MERCHANT_ADDRESS: summary.merchant,
  CLEARING_AGENT_WALLET: summary.agentWallet,
  AGENT_HMAC_SECRET: "x".repeat(32),
  MAINNET_APPROVER_A: summary.approverA,
  MAINNET_APPROVER_B: summary.approverB,
  CLEARING_DAILY_CAP_ATOMIC: summary.dailyCap,
  CLEARING_CANARY_MAX_ATOMIC: summary.canary,
  MAINNET_KYB_ATTESTATION_ID: summary.kybAttestation,
  MAINNET_PREFLIGHT_HASH: hashMainnetSummary(summary),
});
check("kill switch wins", killed.ok === false, killed.ok ? "kill ignored" : "ok");

for (const row of results) {
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.name}  ${row.detail}`);
}
if (results.some((row) => !row.pass)) process.exit(1);
