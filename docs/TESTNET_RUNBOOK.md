# Base Sepolia A2A clearing runbook

This release is testnet-only. It refuses live settlement without PostgreSQL, a merchant wallet,
a KYA-bound buyer wallet, HMAC authentication, and a facilitator. Never put mainnet keys in this
environment.

## 1. Start the durable store

```bash
docker compose -f docker-compose.clearing.yml up -d
copy .env.example .env.local
npm ci --prefix agents/a2a/typescript
npm run db:clearing:migrate
```

Set `CLEARING_MODE=testnet`. Replace all zero addresses and placeholder secrets in `.env.local`.
Generate `AGENT_HMAC_SECRET` with at least 32 random bytes and keep it in a secret manager.

## 2. Configure settlement rails

- USDC: Base Sepolia (`eip155:84532`), canonical token
  `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.
- USDT0: Stable Testnet (`eip155:2201`), canonical token
  `0x78Cf24370174180738C5B8E352B6D14c83a6c9A9`.
- The default public x402 facilitator supports the Base Sepolia path. Set
  `X402_USDT_FACILITATOR_URL` only to a facilitator whose `/supported` response explicitly lists
  `eip155:2201` and `permit2`; otherwise the API fails closed with 503. Configure
  `STABLE_TESTNET_RPC_URL` and pre-approve Permit2 for USDT0 before enabling this optional rail.
- `CLEARING_MERCHANT_ADDRESS` must be the receiving wallet controlled by the test operator.
- `CLEARING_AGENT_WALLET` must exactly match the CDP wallet address for `CLEARING_AGENT_ID`.

## 3. Configure Coinbase AgentKit

Create a CDP Secret API Key and testnet wallet, then set:

```text
CDP_API_KEY_ID
CDP_API_KEY_SECRET
CDP_WALLET_SECRET
CDP_WALLET_ADDRESS
```

Run the application, check readiness, and execute the buyer:

```bash
npm run dev
curl http://localhost:3000/api/clearing/ready
npm run agent:cdp:x402 -- usdc
```

The client signs each HTTP request with HMAC, accepts only the configured merchant and testnet
networks, caps each payment, signs EIP-3009 typed data through CDP, and retries with the official
x402 client. AgentKit is isolated in its own package so its wallet/plugin dependency tree is not
loaded into the payment resource server. Its current upstream high-severity advisories remain a
hard blocker for the phase-C mainnet gate, even though no critical advisory is accepted in CI.

For exact USDC payments, the facilitator broadcasts the EIP-3009 authorization and pays gas, so
an ERC-4337 Paymaster would add complexity without improving this path. Keep ERC-4337 Session Keys
and Paymaster sponsorship for later contract calls (batch settlement and outcome escrow); they
must reuse the same deterministic merchant, token, amount, task, expiry, and replay policy before
being enabled.

## 4. Verify and operate

Before deployment:

```bash
npm run test:clearing
npm run lint
npm run build
npm audit --omit=dev --audit-level=critical
```

Operational alerts:

- `/api/clearing/ready` returns 503 for two consecutive minutes.
- Facilitator verify/settle errors exceed 1% over five minutes.
- Authentication denials, nonce replays, or rate-limit denials spike above baseline.
- A successful chain transaction has no matching `clearing_settlements` and
  `clearing_ledger_entries` row within 60 seconds.
- PostgreSQL connection pool saturation exceeds 80%.

Target SLO for the testnet rail is 99.5% successful paid requests excluding user signature
rejections, with p95 settlement latency under 15 seconds. Do not promote to mainnet from this
branch.
