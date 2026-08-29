import { NextResponse } from "next/server";
import { loadClearing, saveClearing } from "@/lib/clearing/store";
import { consumePayment, sellerRequirement, simulateReceipt } from "@/lib/clearing/orchestrator";
import { appendLedger } from "@/lib/clearing/ledger";
import { decodePaymentProof, paymentRequiredBody, x402Headers } from "@/lib/clearing/x402";
import { PAYMENT_SIGNATURE_HEADER } from "@/lib/clearing/x402";
import type { StableAsset } from "@/lib/clearing/types";

export async function GET(req: Request) {
  const state = loadClearing();
  const url = new URL(req.url);
  const asset = (url.searchParams.get("asset") === "usdt" ? "usdt" : "usdc") as StableAsset;
  const requirement = sellerRequirement(state, asset);

  const proofHeader = req.headers.get(PAYMENT_SIGNATURE_HEADER);
  const txHash = req.headers.get("X-402-Tx-Hash");
  const proof = decodePaymentProof(proofHeader);

  if (!proof && !txHash) {
    return NextResponse.json(paymentRequiredBody(requirement), {
      status: 402,
      headers: x402Headers(requirement),
    });
  }

  const buyer = state.agents.find((a) => a.role === "buyer")!;
  const seller = state.agents.find((a) => a.role === "seller")!;
  const receipt = simulateReceipt({
    token: requirement.token,
    from: proof?.payer ?? buyer.wallet,
    to: requirement.payTo,
    amountAtomic: requirement.amountAtomic,
    txHash: (proof?.txHash ?? txHash) as `0x${string}`,
  });
  const paid = consumePayment(state, receipt, requirement);
  if (!paid.ok) {
    return NextResponse.json({ error: paid.reason }, { status: 400 });
  }
  appendLedger(state, {
    kind: "transfer",
    fromAgentId: buyer.id,
    toAgentId: seller.id,
    asset,
    amountAtomic: requirement.amountAtomic,
    txHash: receipt.transactionHash,
    resource: requirement.resource,
    note: "HTTP 402 retry with verified Transfer event",
  });
  saveClearing(state);
  return NextResponse.json({
    status: "success",
    data: {
      alpha_intel:
        "2026 Q3 autonomous agent commerce: USDC on Base remains the default machine-settlement unit; x402 v2 headers plus AP2 mandates are the interop path.",
      verified_by_tx: receipt.transactionHash,
      asset,
    },
  });
}
