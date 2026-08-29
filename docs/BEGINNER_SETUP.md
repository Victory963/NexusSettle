# Beginner path: first safe A2A payment

This guide has one goal: prove the complete payment state machine without risking real funds,
then show exactly what changes for Base Sepolia. Do not begin with mainnet credentials.

## What you are running

```text
buyer agent
  -> HMAC/KYA identity
  -> HTTP 402 x402 challenge
  -> deterministic policy (merchant, token, amount, task, expiry)
  -> wallet authorization
  -> facilitator verify + settle
  -> canonical ERC-20 evidence
  -> PostgreSQL settlement, ledger, and audit rows
```

The language model may choose a resource URL. It may not choose a payee, token contract, amount,
network, nonce, or signing key.

## Prerequisites

- Node.js 22 or newer
- npm
- Docker only for the testnet PostgreSQL path
- No wallet or API key for the demo path

## 1. Install and verify

From the repository root:

```powershell
npm ci
npm ci --prefix agents/a2a/typescript
npm run check:clearing-config
npm run test:clearing
npm run agent:cdp:typecheck
npm run lint
npm run build
```

`test:clearing:postgres` prints `SKIP` when `DATABASE_URL` is absent. CI runs it against a real
PostgreSQL service.

## 2. Run the zero-fund demo

Keep `CLEARING_MODE=demo` (the development default), then use two terminals:

```powershell
npm run dev
```

```powershell
npm run agent:demo
```

Open `http://localhost:3000/clearing` and press **Demo HTTP 402**. The first request returns 402
with `PAYMENT-REQUIRED`; the retry carries `PAYMENT-SIGNATURE`; success returns
`PAYMENT-RESPONSE`. The displayed transaction hash is deterministic demo evidence, not an
on-chain transaction.

Safety check:

```powershell
Invoke-WebRequest http://localhost:3000/api/clearing/intel
```

The live route must return 503 in demo mode. A random `X-402-Tx-Hash` never unlocks it.

## 3. Move to Base Sepolia

Follow [`TESTNET_RUNBOOK.md`](./TESTNET_RUNBOOK.md). The important differences are:

1. `CLEARING_MODE=testnet`
2. PostgreSQL is mandatory
3. buyer agent ID is bound to the CDP wallet by HMAC
4. official `@x402/next` verifies and settles through a facilitator
5. Base Sepolia USDC uses canonical contract
   `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
6. settlement and ledger rows are written in one database transaction

The optional Stable Testnet USDT0 rail remains disabled until a facilitator advertises
`eip155:2201` plus Permit2 support.

## Failure guide

- **503 DATABASE_URL required**: start PostgreSQL and run `npm run db:clearing:migrate`.
- **401 signed headers required**: use `npm run agent:cdp:x402`; raw browser requests are not a
  testnet agent.
- **403 payer not bound**: `CLEARING_AGENT_WALLET` differs from `CDP_WALLET_ADDRESS`.
- **409 nonce already used**: create a new signed HTTP request; never replay authentication.
- **402 repeats**: wallet lacks test USDC, the facilitator rejected the authorization, or the
  network/token is unsupported.
- **USDT returns 503**: this is intentional until `X402_USDT_FACILITATOR_URL` is configured.
- **PostgreSQL test skips locally**: expected without Docker; CI is the durable-store authority.

## Definition of done

- all clearing tests pass (PostgreSQL may skip only on a machine without `DATABASE_URL`)
- full lint and production build pass
- official testnet challenge returns 402 and `PAYMENT-REQUIRED`
- demo and testnet routes cannot be confused
- no secret appears in Git
- `CLEARING_MAINNET_ENABLED` remains false
