# Codex guide for A2A agents

Scope: everything under `agents/a2a/`.

## Choose the rail first

- Learning without funds: edit/run `typescript/agent.ts`; it may call only
  `/api/clearing/demo/*`.
- Base Sepolia: edit/run `typescript/cdp-x402-client.ts`; use official x402 packages and
  `CdpEvmWalletProvider`.
- Python: `python/server.py` is a receipt-verification example, not a replacement facilitator.
- Mainnet: do not implement or enable it on A-stage branches.

## Non-negotiable boundaries

- The model-facing tool accepts a URL only.
- Merchant, canonical token, amount cap, network, task budget, expiry, and replay keys are
  deterministic inputs.
- A demo signature or synthetic receipt must be rejected outside the demo route.
- Never weaken payer-to-agent binding, nonce uniqueness, HMAC verification, or the canonical
  contract allowlist to make an example pass.
- Do not use deprecated Coinbase `Wallet.create` examples. Use the installed AgentKit README and
  current `CdpEvmWalletProvider`.
- Keep AgentKit dependencies in `agents/a2a/typescript/package.json`; do not add its plugin tree to
  the Next.js resource server.

## Work loop

```powershell
npm ci --prefix agents/a2a/typescript
npm run agent:cdp:typecheck
npm run test:clearing
npm run lint
npm run build
```

For a zero-fund smoke test, start `npm run dev` from the root and run `npm run agent:demo`.
For testnet, follow `docs/TESTNET_RUNBOOK.md` and stop if readiness is not 200.

When changing protocol fields, add a regression for malformed input, wrong payer/payee/token,
underpayment, expired authorization, and replay. Report PostgreSQL integration as skipped when
Docker is unavailable; do not claim it passed locally.
