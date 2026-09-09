<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Lumen A2A payment rules

For changes under `app/api/clearing`, `lib/clearing`, `lib/nexus`, `agents/a2a`, `db`, or `proxy.ts`:

1. Read `docs/BEGINNER_SETUP.md`, `docs/A2A_CLEARING.md`, `docs/NEXUS_SETTLE.md`, and the nearest nested `AGENTS.md`.
2. Keep demo, testnet, and mainnet rails physically and logically distinct.
3. Never generate, copy, log, commit, or request a private key or live API secret.
4. Never accept a token by symbol, a random transaction hash, an LLM-selected payee, or an
   in-memory store for testnet/mainnet settlement.
5. Treat `CLEARING_MAINNET_ENABLED=false` as immutable during A-stage work.
6. Card/FX adapters may quote. They must not send a live Visa/Mastercard authorization or store PAN.
7. Run `npm run test:nexus`, `npm run test:clearing`, `npm run agent:cdp:typecheck`, `npm run lint`, and
   `npm run build` before handing off payment changes.
8. Read the installed Next.js guide in `node_modules/next/dist/docs/` before changing route or
   proxy conventions.

Codex beginners: `docs/CODEX_GUIDE.md` and `lib/nexus/AGENTS.md`.
