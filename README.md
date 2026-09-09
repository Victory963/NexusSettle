# Lumen Studio

在线长片生成：提示词 → 分镜 → 5–15 秒镜头 → 选片 / 美工 / 声画 → 硬切拼成 8 / 20 / 90 / 120 分钟。

界面只出现 Identity、Cinema、Continuity、Drive。

```bash
npm install
npm run dev
```

http://localhost:3000

未配置推理端点时，片场用加速队列演示分镜、选片与拼装。真实后端见 `.env.example`。

## Agent-to-Agent 稳定币清算

USDC / USDT 双轨、HTTP 402、策略沙箱与结果托管：`/clearing`。第一次运行请从
`docs/BEGINNER_SETUP.md` 开始；测试网运维见 `docs/TESTNET_RUNBOOK.md`；协议与架构见
`docs/A2A_CLEARING.md`、`/docs/a2a`。Claude Code 教程见
`docs/CLAUDE_CODE_GUIDE.md`，Codex 教程见 `docs/CODEX_GUIDE.md`，Cursor 教程见
`docs/CURSOR_GUIDE.md`。NEXUS-SETTLE 净额与卡兑换见 `docs/NEXUS_SETTLE.md`。主网发布门控见
`docs/MAINNET_RUNBOOK.md`（默认关闭，需双人审批与 `npm run preflight:mainnet`）。
推送堆叠 PR：`docs/PUSH_STACKED_PRS.md`（需先 `gh auth login`）。
独立 Agent：`agents/a2a/`。
