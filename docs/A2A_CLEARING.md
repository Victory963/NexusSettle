# A2A 稳定币清算栈（Lumen Clearing）

本模块把「链上数字美元」做成 **Agent-to-Agent 清算所**：买方 Agent 不持有主私钥、不把转账参数暴露给 LLM，只在确定性沙箱里应答 HTTP 402，并按 **USDC / USDT 合约地址** 校验 `Transfer` 事件。

```
                    ┌─────────────────────────────────────────┐
                    │  4. Metering / Outcome / Audit ledger   │
                    │  exact · batch vouchers · escrow SHA256 │
                    └────────────────────▲────────────────────┘
                                         │
     ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
     ▼                   ▼                               ▼                   ▼
 Identity (KYA)     Protocol (x402 v2)            Settlement              Liquidity
 Agent credential   402 + PAYMENT-REQUIRED        ERC-20 Transfer         USDC / USDT
 Session policy     AP2 mandate-shaped limits     fake-token reject       simulated | Base
 Intent ≠ Execution MCP tool has URL only         replay cache            Paymaster later
```

## 创新点（相对「裸转 ETH + LLM 调 wallet.transfer」）

1. **意图与执行分离**：Tool 签名只有 `url`。收款地址、金额、合约只来自 402 挑战，经白名单/限额/幂等硬编码校验。Prompt injection 无法把 `to` 改成攻击者地址。
2. **按合约钉死稳定币**：不认 ticker。假 USDC 合约的 `Transfer` 直接拒绝。USDC 与 USDT 双轨，精度 6。
3. **三套 scheme**：`exact`（单次上链语义）、`batch-settlement`（先授权后聚合）、`outcome-escrow`（谓词哈希匹配才放款）。
4. **KYA 轻量登记**：每个 Agent 绑定 owner DID、钱包、声誉，对应 ERC-8004 的登记形态，便于以后换成链上 registry。
5. **x402 v2 头 + 兼容头**：同时发 `PAYMENT-REQUIRED` 与 `X-402-*`，方便现有脚本与 Foundation SDK 对齐。

这不是上市主体本身：上市级支付机构还需要牌照、储备审计、Travel Rule、银行通道与独立托管。本仓库交付的是 **可审计的清算引擎 + 演示轨 + 开源对接面**，作为后续持牌结算层的控制面原型。

## 端到端（Exact）

1. Buyer GET `/api/clearing/demo/intel` → **402** + x402 v2 `PAYMENT-REQUIRED`。
2. Guardrail：商户白名单、token allowlist、单笔/任务预算、每商户支付次数。
3. 演示轨只在 `CLEARING_MODE=demo` 下合成收据；`/api/clearing/intel` 不接受随机 tx hash，测试网/主网必须走 facilitator。
4. Seller 解析 log topic `Transfer(address,address,uint256)`，校验 `address == canonical token`。
5. 200 + `PAYMENT-RESPONSE`；txHash、nonce 与 Payment-Identifier 同时记入防重放集合和复式流水。

## 生产接入（真链）

- Facilitator：https://docs.x402.org/core-concepts/facilitator.md
- AgentKit：隔离客户端见 `agents/a2a/typescript/cdp-x402-client.ts`
- Base Sepolia USDC：`0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- 测试网缺少 PostgreSQL、商户地址或 facilitator 时 `/api/clearing/ready` 返回 503。
- 切主网前必须换 facilitator、完成 KYB，并通过 C 阶段双人审批门禁。

独立 Python / TypeScript Demo：`agents/a2a/`。
可执行测试网步骤：[`TESTNET_RUNBOOK.md`](./TESTNET_RUNBOOK.md)。
