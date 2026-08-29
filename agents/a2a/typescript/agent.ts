/**
 * Credential-free demo client. It cannot call the testnet or mainnet route.
 * Use cdp-x402-client.ts for real Base Sepolia settlement.
 *
 *   npx --prefix agents/a2a/typescript exec tsx agent.ts
 */
import { fetchDemoPaid, type SessionKeyPolicy, type SpendState } from "./guardrails";

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

async function main() {
  const spend: SpendState = { spent: 0n, pays: new Map() };
  const url = `${BASE}/api/clearing/demo/intel?asset=usdc`;
  const data = await fetchDemoPaid(url, policy, spend, async () => {
    const now = Math.floor(Date.now() / 1000);
    return {
      signature: `0x${"00".repeat(65)}`,
      from: "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
      nonce: `0x${crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")}`,
      validAfter: String(now - 5),
      validBefore: String(now + 60),
    };
  });
  console.log(JSON.stringify({ data, spentAtomic: spend.spent.toString() }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
