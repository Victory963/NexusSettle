# NEXUS-SETTLE

Lumen 的 Agent-to-Agent 清算控制面：官方 x402 v2 / EIP-3009 接入，链下复式记账 + 多边净额，再经持牌方做 Visa / Mastercard / ACP 兑换。本文件是工程真相源。上市级门槛在牌照与资本，不在再写一套 `X-402-Tx-Hash` 旁路。

## 对原始资料的纠正

1. **支付头**：官方 x402 v2 使用 `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE`（`X-PAYMENT`）/ `PAYMENT-RESPONSE`。`X-402-Tx-Hash` 回传可被 mempool 重放，不能证明付款人。
2. **CDP**：使用当前 `CdpEvmWalletProvider` / Server Wallet v2。不要用已弃用的 `Wallet.create`。
3. **USDT**：原生 Tether 没有 EIP-3009。默认结算资产是 USDC。USDT 只在具备 EIP-3009 的链（演示轨或 Arbitrum USDT0）启用。
4. **份额数据**：删除“USDC/USDT 占 Agent 交易 98%”。可引用的是 Coinbase / Chainalysis 对 x402 的自报或链上观察，且含投机噪声。

## 产业 SWOT（平台视角）

| | 内容 |
| --- | --- |
| S | HTTP 原生 402、USDC EIP-3009、会话限额、链下净额把 N² 压成 ≤N 笔上链、协议适配层对冲 x402/AP2/ACP |
| W | 无 MTL / BitLicense / 日方电子决済牌照；卡轨只能报价；主网默认锁死 |
| O | 机器微支付无法走 3DS/OTP；GENIUS Act 把合规美元稳定币推成互联网结算单位；东京已有 SBI VC / JPYC 通道 |
| T | Prompt injection / Denial of Wallet；x402 量被 mint 投机污染；Tempo/Arc 未收敛；一旦托管资金即触发 49 州 MTL |

## 竞品对照

| 玩家 | 强项 | 弱项 | 我们不复制的点 |
| --- | --- | --- | --- |
| Coinbase x402 / AgentKit / CDP | 最完整的链上收单栈 | 每调用上链，无多边净额，非法币出金 | 用其协议，不用其“每次都上链”的成本模型 |
| Stripe Tempo + ACP + Bridge/Privy | 卡与稳定币双轨、商户覆盖 | 链与协议仍在许可/试验 | 只接 ACP SPT，不自建卡网络 |
| Circle USDC / CCTP / Gateway / Arc | 发行方流动性与跨链 | 不是 Agent 身份或计量层 | 结算资产与跨链，不自发行 |
| Skyfire | KYA + spend control | 融资与生态小于公链标准 | 身份形态，不把余额托管进来 |
| Catena Labs | a16z 背书的 agent 金融基建 | 产品面未公开到可复现 | 不押单一封闭栈 |
| Nevermined | 跨协议计量与 outcome pricing | 不做法币清算 | 计量思想，仲裁另走 UMA/Kleros 路线 |
| Visa TAP / Mastercard Agent Pay / PayPal ACP | 全球卡与钱包 | 人类商户网络，不是 A2A 净额所 | 出金外包，本仓库永不持 PAN |

## 创新点（本 PR 落地的部分）

1. **统一 `PaymentIntent`**：x402、AP2 mandate、ACP SPT、卡报价进入同一结构。LLM 工具禁止 `to_address` / `amount`。
2. **复式账本**：每笔记账 `SUM(amount)=0`，且按资产分腿平衡。`ext_ref` 幂等。清算账户允许负余额作为对方科目。
3. **多边净额**：窗口内链下记账，星型经 `CLEARING` 压缩为每方至多一笔上链指令。
4. **卡/法币适配器**：产出不可执行的 Visa TAP / Mastercard Agent Pay / ACP 指令。`NEXUS_CARD_PARTNER_ENABLED=true` 也只把状态标成 `paper`，不会发真实授权。
5. **USDT 能力表**：按 `(asset, chain)` 判断 EIP-3009，而不是一个全局开关。

未在本 PR 上链部署的：UMA OOV3 托管、Cedar 策略编译、Fireblocks 托管、Travel Rule 报文。这些写在路线图里，不伪装成已生产。

## 安全边界

```text
LLM 只选 URL
  -> PaymentIntent（确定性构造）
  -> Guardrail（白名单 / 限额 / 制裁分 / nonce）
  -> Journal（复式、幂等）
  -> Netting window（链下）
  -> x402 facilitator 或持牌卡合作方
```

平台不控制用户私钥，不做“接受价值再转发”。一旦托管余额或做法币出入金，必须外包持牌机构。

## 命令

```powershell
npm run test:nexus
npm run test:clearing
```

演示：

- `POST /api/clearing/demo/nexus/window` — 四方义务净额 + 卡报价
- `GET /api/clearing/demo/nexus/quote?from=USDC&to=USD&amount=1000000` — 纸面兑换

清算台按钮：**Nexus net window**、**Card quote**。

## Claude Code / Codex

同一实现、同一验收。差别只在入口：

| 工具 | 入口 |
| --- | --- |
| Codex | 根 `AGENTS.md`、`lib/nexus/AGENTS.md`、`docs/CODEX_GUIDE.md` |
| Claude Code | `CLAUDE.md`、`.claude/skills/nexus-settle/SKILL.md`、`docs/CLAUDE_CODE_GUIDE.md` |
| Cursor | `.cursor/rules/`、`docs/CURSOR_GUIDE.md` |

主网仍然走 `docs/MAINNET_RUNBOOK.md`。本阶段禁止打开 `CLEARING_MAINNET_ENABLED`。
