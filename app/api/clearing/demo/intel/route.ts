import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/clearing/config";
import {
  deterministicDemoTxHash,
  sellerRequirement,
  settleAuthorizedPayment,
  simulateReceipt,
} from "@/lib/clearing/orchestrator";
import { loadClearing, saveClearing } from "@/lib/clearing/store";
import {
  decodePaymentPayload,
  PAYMENT_SIGNATURE_HEADER,
  paymentRequiredBody,
  proofFromPaymentPayload,
  settlementHeaders,
  x402Headers,
} from "@/lib/clearing/x402";
import type { StableAsset } from "@/lib/clearing/types";

export async function GET(req: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo settlement is disabled" }, { status: 404 });
  }

  const state = loadClearing();
  const url = new URL(req.url);
  const asset = (url.searchParams.get("asset") === "usdt" ? "usdt" : "usdc") as StableAsset;
  const requirement = sellerRequirement(state, asset);
  const signatureHeader = req.headers.get(PAYMENT_SIGNATURE_HEADER);

  if (!signatureHeader) {
    return NextResponse.json(paymentRequiredBody(requirement, url.toString()), {
      status: 402,
      headers: x402Headers(requirement, url.toString()),
    });
  }

  const payload = decodePaymentPayload(signatureHeader);
  if (!payload) {
    return NextResponse.json({ error: "Malformed PAYMENT-SIGNATURE" }, { status: 400 });
  }

  const agentId = req.headers.get("X-Lumen-Agent-Id") ?? "";
  const taskId = req.headers.get("X-Lumen-Task-Id") ?? "";
  const paymentIdentifier = req.headers.get("Payment-Identifier") ?? "";
  if (!agentId || !taskId || !paymentIdentifier) {
    return NextResponse.json(
      { error: "Agent, task, and payment identifiers are required" },
      { status: 400 },
    );
  }

  const nonce = payload.payload.authorization.nonce;
  const txHash = deterministicDemoTxHash(nonce, paymentIdentifier);
  const proof = proofFromPaymentPayload({
    payload,
    requirement,
    agentId,
    taskId,
    paymentIdentifier,
    txHash,
  });
  if (!proof) {
    return NextResponse.json({ error: "Payment selection does not match challenge" }, { status: 400 });
  }

  const receipt = simulateReceipt({
    token: proof.token,
    from: proof.payer,
    to: proof.payTo,
    amountAtomic: proof.amountAtomic,
    txHash,
  });
  const result = settleAuthorizedPayment({ state, requirement, proof, receipt });
  if (!result.ok) {
    const status = result.reason.includes("consumed") ? 409 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  saveClearing(state);
  return NextResponse.json(
    {
      status: "success",
      mode: "demo",
      data: {
        alpha_intel:
          "A policy-authorized x402 v2 demo payment unlocked this resource; no on-chain funds moved.",
        verified_by_tx: txHash,
        asset,
      },
    },
    {
      headers: settlementHeaders({
        success: true,
        transaction: txHash,
        network: requirement.network,
        payer: proof.payer,
      }),
    },
  );
}
