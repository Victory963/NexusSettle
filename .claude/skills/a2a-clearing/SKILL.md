---
name: a2a-clearing
description: Safely implement, test, or diagnose Lumen x402 USDC/USDT agent payments.
argument-hint: "[demo|testnet|diagnose] [goal]"
allowed-tools: Read, Grep, Glob, Bash
---

# Lumen A2A clearing workflow

Use this skill when work touches x402 headers, stablecoin verification, AgentKit/CDP, KYA/HMAC,
payment policy, PostgreSQL clearing, or the clearing dashboard.

## 1. Classify the requested rail

- `demo`: zero-fund, synthetic evidence, `/api/clearing/demo/*` only.
- `testnet`: official facilitator plus Base Sepolia USDC; durable PostgreSQL and KYA/HMAC required.
- `diagnose`: inspect and explain first; do not broaden into mainnet.
- If the user requests mainnet, stop and point to the phase-C release gates.

## 2. Read the source of truth

Read:

1. `docs/BEGINNER_SETUP.md`
2. `docs/A2A_CLEARING.md`
3. `docs/TESTNET_RUNBOOK.md`
4. nearest `AGENTS.md`
5. installed Next.js docs before changing route/proxy code

## 3. Preserve invariants

Trace the value from challenge to settlement and prove all of these:

- authenticated agent ID maps to the payment payer
- merchant and canonical token are allowlisted
- amount is exact and inside per-payment/per-task caps
- authorization is currently valid
- nonce, payment identifier, and transaction hash cannot replay
- successful settlement produces one settlement row and one ledger row
- failed resource handlers are not charged
- secrets and private keys never cross into model context

## 4. Implement with tests

Add or update a negative regression for every changed boundary. Prefer the official x402 packages
over hand-built live-protocol code. Synthetic helpers may exist only under the demo route.

## 5. Verify

Run:

```powershell
npm run check:clearing-config
npm run test:clearing
npm run agent:cdp:typecheck
npm run lint
npm run build
```

If `DATABASE_URL` is unavailable, explicitly report the PostgreSQL integration test as skipped.
Do not claim a real-chain payment without a testnet transaction hash and facilitator response.
