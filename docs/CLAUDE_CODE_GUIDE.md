# Claude Code: beginner workflow

Claude Code and Codex use the same implementation, commands, and acceptance evidence. The only
difference is how project instructions are loaded: Claude reads `CLAUDE.md`,
`.claude/rules/a2a-payments.md`, and the `/a2a-clearing` skill.

## First session

Start Claude Code at the repository root, then ask:

```text
Use /a2a-clearing in demo mode. Read the referenced guides, inspect the current state,
run the credential-free demo acceptance commands, and explain each trust boundary.
Do not edit files and do not request secrets.
```

Expected evidence:

- configuration check passes for `demo`
- clearing unit, HTTP, and HMAC tests pass
- PostgreSQL test may be explicitly skipped without `DATABASE_URL`
- AgentKit package type-checks
- lint and build pass

## Safe implementation prompt

```text
Use /a2a-clearing testnet. Implement <small goal>.
Before editing, identify which identity, protocol, settlement, or metering boundary changes.
Keep mainnet disabled. Add negative regressions for payer, token, amount, expiry, and replay
as applicable. Run the complete acceptance sequence and report skipped checks exactly.
```

Give Claude one small boundary at a time. Review the diff before moving to the next one.

## Diagnosis prompt

```text
Use /a2a-clearing diagnose. The failing command is <command> and the exact output is <output>.
Find the root cause with read-only checks. Distinguish missing credentials/infrastructure from
code defects. Do not implement a fix until the diagnosis is supported by evidence.
```

Common valid diagnoses include missing PostgreSQL migrations, a payer/CDP wallet mismatch,
expired HMAC timestamps, facilitator network mismatch, or an unsupported USDT0 Permit2 rail.

## Testnet execution

Follow `TESTNET_RUNBOOK.md`; enter credentials yourself through `.env.local` or a secret manager.
Do not paste credentials into chat. Ask Claude to run:

```text
Validate the names and non-secret shape of my testnet configuration without printing values.
Then check /api/clearing/ready. Stop before payment if readiness is not 200.
```

Only after readiness succeeds:

```text
Run the Base Sepolia USDC buyer once. Report the HTTP statuses, PAYMENT-RESPONSE presence,
testnet transaction hash, and matching durable ledger evidence. Redact every credential.
```

## Review checklist

Reject a proposed change if it:

- passes a payee, amount, private key, or token address through an LLM tool call
- treats a transaction hash as self-authenticating
- accepts `symbol === "USDC"` instead of a canonical contract
- permits synthetic signatures outside `/api/clearing/demo/*`
- writes a successful paid response before settlement is guaranteed
- stores testnet/mainnet replay state only in process memory
- weakens a guardrail without a negative regression
- enables mainnet or hides a skipped/failing check
