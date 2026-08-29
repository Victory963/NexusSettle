# A2A micropayment demos

Use one of two explicit rails:

- `npm run agent:demo` signs a synthetic payload and can call only
  `/api/clearing/demo/intel` while `CLEARING_MODE=demo`.
- `npm run agent:cdp:x402 -- usdc` uses the isolated AgentKit package, CDP wallet,
  official x402 client, HMAC identity, and the `/api/clearing/intel` testnet route.

Install the isolated client once:

```powershell
npm ci --prefix agents/a2a/typescript
```

The model receives only a resource URL. Payee, amount, token, network, expiry, task budget, and
replay identifiers stay in deterministic code. Synthetic signatures are rejected outside the
demo path.

## Python receipt-verifier example

`python/server.py` is an educational receipt-log verifier, not the production x402 server. It
fails closed unless `RPC_URL`, `MERCHANT_ADDRESS`, and `PAYER_ADDRESS` are configured, and checks
the canonical Base Sepolia USDC contract, exact amount, payer, payee, receipt status, and replay.
Use the Next.js route for actual x402 v2 settlement.

Start with [`../../docs/BEGINNER_SETUP.md`](../../docs/BEGINNER_SETUP.md). Testnet operations are
in [`../../docs/TESTNET_RUNBOOK.md`](../../docs/TESTNET_RUNBOOK.md).
