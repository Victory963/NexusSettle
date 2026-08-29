import { evaluateMainnetGate, hashMainnetSummary } from "../lib/clearing/mainnet-gate";

const gate = evaluateMainnetGate({
  ...process.env,
  CLEARING_MODE: "mainnet",
  MAINNET_PREFLIGHT_HASH: undefined,
});

const summary =
  gate.ok
    ? gate.summary
    : {
        network: "eip155:8453",
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        facilitator: process.env.X402_FACILITATOR_URL ?? "",
        merchant: process.env.CLEARING_MERCHANT_ADDRESS ?? "",
        agentWallet: process.env.CLEARING_AGENT_WALLET ?? "",
        dailyCap: process.env.CLEARING_DAILY_CAP_ATOMIC ?? "",
        canary: process.env.CLEARING_CANARY_MAX_ATOMIC ?? "",
        approverA: process.env.MAINNET_APPROVER_A ?? "",
        approverB: process.env.MAINNET_APPROVER_B ?? "",
        kybAttestation: process.env.MAINNET_KYB_ATTESTATION_ID ?? "",
      };

const hash = hashMainnetSummary(summary);
console.log(JSON.stringify({ hash, summary, remaining: gate.ok ? [] : gate.reasons }, null, 2));
console.log(`Set MAINNET_PREFLIGHT_HASH=${hash} only after both approvers review this summary.`);
