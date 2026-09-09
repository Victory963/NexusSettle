# Codex: beginner workflow

Codex and Claude Code implement the same clearing core. Codex loads `AGENTS.md`,
`agents/a2a/AGENTS.md`, and `lib/nexus/AGENTS.md`. Do not invent a second protocol.

## First session

```text
Read docs/BEGINNER_SETUP.md, docs/NEXUS_SETTLE.md, and AGENTS.md.
Inspect the current payment and nexus files. Run the credential-free demo
acceptance commands. Explain each trust boundary. Do not edit files and
do not request secrets.
```

Expected evidence:

- `npm run check:clearing-config` passes for `demo`
- `npm run test:nexus` and `npm run test:clearing` pass
- PostgreSQL test may be skipped without `DATABASE_URL`
- AgentKit package type-checks
- lint and build pass

## Safe implementation prompt

```text
Implement <small nexus or x402 goal>.
Identify whether the change is identity, PaymentIntent, journal, netting,
card/FX paper rail, or facilitator settlement.
Keep mainnet disabled. Never send a live card authorization.
Add negative regressions for payer, asset, amount, expiry, replay, and
unbalanced journal entries as applicable.
Run npm run test:nexus and the complete clearing acceptance sequence.
```

## Diagnosis prompt

```text
The failing command is <command> and the exact output is <output>.
Find the root cause with read-only checks. Distinguish missing
credentials/infrastructure from code defects. Do not implement a fix
until the diagnosis is supported by evidence.
```

Valid diagnoses include an unbalanced journal entry, a USDT rail without
EIP-3009, a card quote treated as executable, a replayed `ext_ref`, or a
facilitator/network mismatch.

## Review checklist

Reject a proposed change if it:

- passes a payee, amount, or token through an LLM tool
- treats a transaction hash as self-authenticating
- accepts a stablecoin by ticker
- posts an unbalanced journal entry
- marks a Visa/Mastercard instruction executable
- enables mainnet or hides a skipped check
