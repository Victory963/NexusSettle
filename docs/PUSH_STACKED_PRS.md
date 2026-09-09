# Stacked PR push (after `gh auth login`)

From `C:\Users\kingc\Projects\lumen-studio-a2a-prs`:

```powershell
$gh = "$env:LOCALAPPDATA\lumen-tools\gh\bin\gh.exe"
& $gh auth login
& $gh repo create Victory963/lumen-studio --private --source=. --remote=origin --push
# If repo exists: git remote add origin https://github.com/Victory963/lumen-studio.git

git push -u origin main
foreach ($b in @(
  "feat/a2a-pr1-security",
  "feat/a2a-pr2-testnet",
  "feat/a2a-pr3-codex",
  "feat/a2a-pr4-claude",
  "feat/a2a-pr5-cursor",
  "feat/a2a-phase-c-mainnet",
  "feat/a2a-nexus-settle"
)) { git push -u origin $b }

& $gh pr create --base main --head feat/a2a-pr1-security --title "Harden x402 payment authorization boundaries" --body "## Summary`n- Close synthetic receipt bypass on live intel.`n- Align x402 v2 headers and policy/nonce checks.`n`n## Test plan`n- [ ] npm run test:clearing:unit`n- [ ] npm run test:clearing:http"
& $gh pr create --base feat/a2a-pr1-security --head feat/a2a-pr2-testnet --title "Add durable Base Sepolia settlement rail" --body "## Summary`n- PostgreSQL, HMAC, facilitator, CDP AgentKit path.`n`n## Test plan`n- [ ] npm run test:clearing`n- [ ] npm run check:clearing-config"
& $gh pr create --base feat/a2a-pr2-testnet --head feat/a2a-pr3-codex --title "Guide Codex through safe payment development" --body "## Summary`n- Beginner setup + AGENTS.md payment rules.`n`n## Test plan`n- [ ] Follow docs/BEGINNER_SETUP.md demo path"
& $gh pr create --base feat/a2a-pr3-codex --head feat/a2a-pr4-claude --title "Teach Claude Code the clearing workflow" --body "## Summary`n- CLAUDE.md, .claude rules/skill, Claude guide.`n`n## Test plan`n- [ ] Open docs/CLAUDE_CODE_GUIDE.md first-run prompt"
& $gh pr create --base feat/a2a-pr4-claude --head feat/a2a-pr5-cursor --title "Teach Cursor the A2A payment constraints" --body "## Summary`n- .cursor/rules + CURSOR_GUIDE + desk readiness.`n`n## Test plan`n- [ ] Demo HTTP 402 on /clearing"
& $gh pr create --base feat/a2a-pr5-cursor --head feat/a2a-phase-c-mainnet --title "Gate mainnet behind dual approval and KYB" --body "## Summary`n- Mainnet gate, kill switch, forbid public facilitator.`n- Code does not replace license/custody/audit.`n`n## Test plan`n- [ ] npm run test:mainnet-gate`n- [ ] CLEARING_MODE=mainnet without preflight returns 503"
& $gh pr create --base feat/a2a-phase-c-mainnet --head feat/a2a-nexus-settle --title "Add NEXUS-SETTLE netting and paper card rails" --body "## Summary`n- PaymentIntent + double-entry journal + multilateral netting.`n- Visa/Mastercard/ACP quotes stay non-executable.`n- Claude Code and Codex share the same tests.`n`n## Test plan`n- [ ] npm run test:nexus`n- [ ] npm run test:clearing`n- [ ] Demo Nexus net window on /clearing"
```
