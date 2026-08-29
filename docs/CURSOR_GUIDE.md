# Cursor: beginner A2A payment workflow

Cursor uses the same code and acceptance gates as Codex and Claude Code. The project rules under
`.cursor/rules/` automatically add payment safety and verification context when relevant files
are open.

| File | When it applies |
| --- | --- |
| `lumen-core.mdc` | Every chat |
| `nextjs-app-router.mdc` | `app/**` |
| `clearing-security.mdc` plus `a2a-payment-*.mdc` | clearing / agents / `proxy.ts` |
| `film-pipeline.mdc` | planner, engines, project APIs |

## Import the repo

1. File → Open Folder → this repository root (not a nested `app/` directory).
2. Confirm the status bar shows the git branch. A-stage work belongs on stacked `feat/a2a-pr*` branches.
3. Copy `.env.example` to `.env.local` yourself. Never paste secrets into chat.

## Agent vs Plan

- **Plan**: architecture, PR split, or anything that would spend funds or change trust boundaries.
- **Agent**: a single bounded code change after the trust boundary is named.
- Use the terminal inside Cursor for `npm run …`. Use the Cursor browser tab for `/clearing` and `/docs/a2a`.

## First safe run

1. Open the repository root in Cursor.
2. Open `docs/BEGINNER_SETUP.md`.
3. In Agent mode, send:

```text
Read @docs/BEGINNER_SETUP.md, @docs/A2A_CLEARING.md, and @AGENTS.md.
Run the zero-fund demo acceptance path without editing files.
Explain the identity, x402, settlement, and metering boundaries.
Never request secrets or enable mainnet.
```

4. Start `npm run dev`.
5. Open `http://localhost:3000/clearing` in Cursor's browser.
6. Press **Demo HTTP 402** and verify the log shows `step1.status: 402`,
   `step2.status: 200`, `PAYMENT-REQUIRED`, and `PAYMENT-RESPONSE`.

The demo hash is not on-chain evidence. The live `/api/clearing/intel` route must return 503 while
the mode is `demo`.

## Make a small change

Open the exact route or library file first so the path-specific Cursor rule is active, then send:

```text
Implement <small payment change>. First identify the changed trust boundary.
Keep demo/testnet/mainnet separate, add the relevant negative regressions, and run:
check:clearing-config, test:clearing, agent:cdp:typecheck, lint, and build.
Report every skipped check exactly.
```

Review the diff in Source Control. Reject changes that put payment parameters in an LLM prompt,
accept a symbol instead of a canonical token, synthesize a live receipt, or add a memory fallback
to testnet.

## Diagnose safely

```text
Diagnose this exact error using read-only checks: <paste non-secret output>.
Separate configuration/infrastructure failures from code defects.
Do not implement or weaken a guardrail until the cause is supported by evidence.
```

Never paste `.env.local`, a CDP wallet secret, API key, HMAC secret, or private key into chat.
Cursor can validate variable names and shapes with `npm run check:clearing-config` without printing
their values.

## Base Sepolia

Follow `docs/TESTNET_RUNBOOK.md`, enter secrets yourself, and ask Cursor to stop unless
`/api/clearing/ready` returns 200. A successful testnet acceptance must include:

- authenticated CDP wallet equals the configured agent wallet
- official x402 `PAYMENT-RESPONSE`
- Base Sepolia transaction hash
- matching PostgreSQL settlement and ledger rows
- no critical dependency advisory

USDT0 is optional and must stay 503 until a facilitator advertises Stable Testnet plus Permit2.
Mainnet remains a separate C-stage release decision. Do not set `CLEARING_MAINNET_ENABLED=true`
from a Cursor chat.

## Open a safe PR

1. Stage only the files for one concern.
2. Paste the Summary / Test Plan from the branch description; include skipped checks.
3. Link `docs/CURSOR_GUIDE.md` so reviewers know which Cursor rules were in effect.
