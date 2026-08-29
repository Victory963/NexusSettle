# A2A micropayment demos

## Python merchant (USDC Transfer logs)

```bash
python agents/a2a/python/server.py
```

Set `RPC_URL` to enable live `eth_getTransactionReceipt` checks against the canonical USDC contract. Without it, a presented `X-402-Tx-Hash` is recorded for replay protection only (local dry-run).

## TypeScript buyer agent

Requires the Next app:

```bash
npm run dev
npx --yes tsx agents/a2a/typescript/agent.ts
```

The agent tool surface is `url` only. `guardrails.ts` owns payee, amount, allowlists, and idempotency.

## CDP

See `typescript/cdp-wallet.adapter.ts`. Use `@coinbase/agentkit` `CdpEvmWalletProvider`, not the retired `Wallet.create` API from older tutorials.
