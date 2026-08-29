/**
 * Optional Coinbase CDP adapter. Do not import this from the Next.js app unless
 * CDP credentials exist. Current SDK (not the deprecated @coinbase/coinbase-sdk Wallet.create):
 *
 *   npm i @coinbase/agentkit @coinbase/cdp-sdk viem
 *
 *   CdpEvmWalletProvider.configureWithWallet({
 *     apiKeyId: process.env.CDP_API_KEY_ID,
 *     apiKeySecret: process.env.CDP_API_KEY_SECRET,
 *     walletSecret: process.env.CDP_WALLET_SECRET,
 *     networkId: "base-sepolia",
 *   })
 *
 * Then call the ERC-20 transfer action against the 402 payTo / amount, still
 * only after guardrails.ts has approved the challenge. Never pass payTo/amount
 * through an LLM tool schema.
 *
 * Docs: https://github.com/coinbase/agentkit
 */
export const CDP_ENV = ["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET"] as const;
