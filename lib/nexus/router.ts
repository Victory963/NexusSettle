import { supportsEip3009 } from "./guardrail";
import type { PaymentIntent } from "./types";

export type RoutedRail = {
  rail: "x402-eip3009" | "card-paper" | "acp-spt" | "ap2-mandate" | "rejected";
  reason: string;
};

export function routeIntent(intent: PaymentIntent): RoutedRail {
  if (intent.protocol === "x402") {
    if (!supportsEip3009(intent.asset, intent.network) && intent.asset !== "USDC") {
      return { rail: "rejected", reason: "USDT without EIP-3009 is not routed" };
    }
    return { rail: "x402-eip3009", reason: "official X-PAYMENT + facilitator settle" };
  }
  if (intent.protocol === "ap2") {
    return { rail: "ap2-mandate", reason: "AP2 mandate is an authorization envelope, not a settlement rail" };
  }
  if (intent.protocol === "acp") {
    return { rail: "acp-spt", reason: "ACP shared payment token stays with a licensed card processor" };
  }
  return { rail: "card-paper", reason: "Visa/Mastercard adapter quotes only; no live authorization" };
}
