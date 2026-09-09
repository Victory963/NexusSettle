---
name: nexus-settle
description: Implement or diagnose NEXUS-SETTLE journal, netting, and paper card/FX rails.
argument-hint: "[demo|diagnose] [goal]"
allowed-tools: Read, Grep, Glob, Bash
---

# NEXUS-SETTLE workflow

Use this skill for `lib/nexus`, demo nexus routes, or multilateral netting / card quotes.

## 1. Classify

- `demo`: in-memory journal and paper Visa/Mastercard quotes only.
- `diagnose`: read-only until the failing assertion is identified.
- Live card send or mainnet enablement: stop.

## 2. Read

1. `docs/NEXUS_SETTLE.md`
2. `docs/A2A_CLEARING.md`
3. `lib/nexus/AGENTS.md`
4. nearest `AGENTS.md`

## 3. Invariants

- PaymentIntent is not built from LLM payee/amount fields
- journal `SUM(amount) = 0` per entry and per asset
- `ext_ref` replay returns the original entry
- net positions sum to zero
- card quotes are not executable and never include PAN
- USDT is capability-checked per chain

## 4. Verify

```powershell
npm run test:nexus
npm run test:clearing
```
