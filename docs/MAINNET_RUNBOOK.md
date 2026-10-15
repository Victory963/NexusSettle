# Mainnet release gate (phase C)

This document is a **release control**, not a license, custody agreement, or financial audit.
Shipping this code does not make NexusSettle a payment institution.

Default: `CLEARING_MODE=testnet` or `demo`, `CLEARING_MAINNET_ENABLED=false`.
The public `https://x402.org/facilitator` path is **forbidden** on mainnet.

## Must exist before anyone flips the flag

1. Production facilitator that supports Base `eip155:8453` USDC (EIP-3009).
2. CDP or TEE-hosted signer whose address equals `CLEARING_AGENT_WALLET`.
3. Enterprise KYB/KYA attestation ID (`MAINNET_KYB_ATTESTATION_ID`).
4. Two distinct human approvers (`MAINNET_APPROVER_A`, `MAINNET_APPROVER_B`).
5. Daily notional cap and a smaller canary cap (atomic USDC units).
6. PostgreSQL, HMAC secret, merchant wallet, and RPC that are not testnet leftovers.

USDT on Base is optional. Enable it only when the **production** facilitator `/supported`
response lists the canonical USDT contract and `permit2`. Never trust the ticker.

## Preflight

```bash
npm run preflight:mainnet
```

Review the JSON summary. Both approvers copy `MAINNET_PREFLIGHT_HASH` into the secret store.
`CLEARING_MAINNET_ENABLED=true` still fails unless that hash matches the live env.

## Kill switch and rollback

- Set `CLEARING_KILL_SWITCH=true` to fail closed on `/api/clearing/intel` and `proxy.ts`.
- Rotate `AGENT_HMAC_SECRET` and CDP wallet if a signer is suspected.
- Reconcile `clearing_settlements` against Base receipts; missing rows within 60s is an incident.
- Roll back by setting `CLEARING_MODE=testnet` and `CLEARING_MAINNET_ENABLED=false`. Do not
  rewrite ledger history.

Canary: keep `CLEARING_CANARY_MAX_ATOMIC` at or below 1 USDC until 24h of matching
on-chain vs ledger counts.
