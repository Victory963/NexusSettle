# NexusSettle

Agent 对 Agent 的稳定币清算。Agent 只能选择资源 URL。应付义务记入复式账本，窗口内做多边净额，只结算差额。默认资产是 USDC。Visa 与 Mastercard 只给出不可执行的报价，不含卡号。

```bash
npm install
npm run dev
```

打开 http://localhost:3000/clearing 。演示时保持 `CLEARING_MODE=demo`，在清算台依次运行 Nexus net window 和 Card quote。

## 验证

```bash
npm run test:nexus
npm run test:clearing
```

## 文档

- 第一次运行：`docs/BEGINNER_SETUP.md`
- 协议与架构：`docs/A2A_CLEARING.md`
- 净额与卡兑换：`docs/NEXUS_SETTLE.md`
- 测试网：`docs/TESTNET_RUNBOOK.md`
- 主网门控：`docs/MAINNET_RUNBOOK.md`（默认关闭，需要双人审批和 `npm run preflight:mainnet`）
- 独立 Agent：`agents/a2a/`

## 边界

- 主网发送默认关闭。
- 不按代币代号选币，不把交易哈希当作付款证明。
- Monad 与 Base 上的原生 USDT 会被拒绝。
- 不生成私钥，不保存卡号，不发起真实的 Visa / Mastercard 授权。
