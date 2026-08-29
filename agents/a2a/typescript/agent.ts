/**
 * Agent client: x402 consume + policy sandbox.
 * Production: swap `simulatedPay` for CdpEvmWalletProvider (see cdp-wallet.adapter.ts).
 *
 *   npx --yes tsx agents/a2a/typescript/agent.ts
 */
import { fetchPaid, type SessionKeyPolicy, type SpendState } from "./guardrails";

const BASE = process.env.CLEARING_URL ?? "http://127.0.0.1:3000";

const policy: SessionKeyPolicy = {
  maxPerTx: 500_000n,
  maxPerTask: 2_000_000n,
  asset: "usdc",
  merchantWhitelist: ["0x71c7656ec7ab88b098defb751b7401b5f6d8976f"],
  allowedContracts: [
    "0x1111111111111111111111111111111111111111",
    "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  ],
  validUntil: Date.now() + 86_400_000,
  maxPaysPerMerchant: 1,
};

async function simulatedPay() {
  return `0x${crypto.randomUUID().replace(/-/g, "")}`;
}

async function main() {
  const spend: SpendState = { spent: 0n, pays: new Map() };
  const url = `${BASE}/api/clearing/intel?asset=usdc`;
  const data = await fetchPaid(url, policy, spend, simulatedPay);
  console.log(JSON.stringify({ data, spentAtomic: spend.spent.toString() }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
