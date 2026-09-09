---
paths:
  - "app/api/clearing/**/*"
  - "lib/clearing/**/*"
  - "lib/nexus/**/*"
  - "agents/a2a/**/*"
  - "db/migrations/**/*"
  - "proxy.ts"
---

# A2A payment safety

Read `docs/BEGINNER_SETUP.md`, `docs/TESTNET_RUNBOOK.md`, and the closest `AGENTS.md` before
editing these paths.

- Keep `demo`, `testnet`, and `mainnet` as separate trust domains.
- The LLM chooses a resource URL only. Deterministic code owns merchant, asset contract, network,
  amount, expiry, task budget, nonce, and idempotency.
- Use CAIP-2 network IDs and canonical token addresses. Never trust ticker text.
- A valid-looking transaction hash is not payment evidence. Require official facilitator
  verification/settlement or a canonical successful receipt with exact payer, payee, token, and
  amount.
- Testnet and mainnet require PostgreSQL; do not add an in-memory fallback.
- Never expose secrets in code, diffs, logs, prompts, test fixtures, or screenshots.
- Do not change `CLEARING_MAINNET_ENABLED` during A-stage work.
- Add negative tests before relaxing any guardrail.
- Card/FX code may emit paper quotes only. Never mark them executable.
- Run the same acceptance sequence used by CI:
  `npm run check:clearing-config`, `npm run test:nexus`, `npm run test:clearing`,
  `npm run agent:cdp:typecheck`, `npm run lint`, `npm run build`.
