import { NextResponse } from "next/server";
import { getClearingMode } from "@/lib/clearing/config";
import { issueCardInstruction } from "@/lib/nexus/card-rail";
import { quoteFx } from "@/lib/nexus/fx";
import { paymentIntentFromCardQuote } from "@/lib/nexus/intent";
import type { NexusAsset } from "@/lib/nexus/types";

const ASSETS = new Set<NexusAsset>(["USDC", "USDT", "USD", "JPY"]);

export async function GET(req: Request) {
  if (getClearingMode() !== "demo") {
    return NextResponse.json({ error: "Card/FX quotes are demo-only in this build" }, { status: 503 });
  }
  const url = new URL(req.url);
  const fromAsset = (url.searchParams.get("from") ?? "USDC").toUpperCase() as NexusAsset;
  const toAsset = (url.searchParams.get("to") ?? "USD").toUpperCase() as NexusAsset;
  const amount = url.searchParams.get("amount") ?? "1000000";
  const partner = url.searchParams.get("partner") === "mastercard" ? "mastercard" : "visa";
  if (!ASSETS.has(fromAsset) || !ASSETS.has(toAsset)) {
    return NextResponse.json({ error: "unsupported asset pair" }, { status: 400 });
  }
  try {
    const quote = quoteFx({ fromAsset, toAsset, fromAmountAtomic: amount });
    const intent = paymentIntentFromCardQuote({
      payerAgentId: "agent-seller-intel",
      payeeAgentId: "card-merchant-treasury",
      asset: toAsset === "JPY" ? "JPY" : "USD",
      amountAtomic: quote.toAmountAtomic,
      network: toAsset === "JPY" ? "fiat:jpy" : "fiat:usd",
      nonce: `quote-${amount}`,
      resource: `${partner}://paper-offramp`,
      partner,
    });
    const instruction = issueCardInstruction({
      intent,
      quote,
      partner: partner === "mastercard" ? "mastercard-agent-pay" : "visa-tap",
    });
    return NextResponse.json({ quote, instruction, executable: false });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "quote failed" }, { status: 400 });
  }
}
