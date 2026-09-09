# Codex guide for NEXUS-SETTLE

Scope: `lib/nexus/**`, `app/api/clearing/demo/nexus/**`, `db/migrations/002_nexus_journal.sql`.

## What this layer owns

- `PaymentIntent` adapters for x402, AP2, ACP, and card quotes
- Double-entry journal with per-asset balance and `ext_ref` idempotency
- Multilateral netting (star topology via `CLEARING`)
- Paper FX / Visa / Mastercard / ACP quotes

It does not own live facilitator settlement. That stays in `lib/clearing`.
It does not own card authorizations, PAN storage, or money transmission.

## Non-negotiable

- Construct intents from protocol fields. Reject `to_address`, `amount`, `privateKey`.
- Default asset is USDC with EIP-3009. Native USDT on Base is rejected.
- Journal entries must balance globally and per asset.
- Card instructions set `containsPan: false` and `executable: false`.
- Demo routes only. Do not add a live `/api/clearing/nexus` send path in this stage.

## Verify

```powershell
npm run test:nexus
npm run test:clearing
```
