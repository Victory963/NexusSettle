import { withX402 } from "@x402/next";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyAgentRequest } from "@/lib/clearing/auth";
import { writeAudit } from "@/lib/clearing/audit";
import { tokenFor } from "@/lib/clearing/assets";
import { getClearingMode } from "@/lib/clearing/config";
import {
  getClearingRepository,
  hasDurableClearingStore,
} from "@/lib/clearing/repository";
import { decodePaymentPayload, PAYMENT_SIGNATURE_HEADER } from "@/lib/clearing/x402";
import { getX402Server } from "@/lib/clearing/x402-server";

async function unavailable(reason: string): Promise<NextResponse<unknown>> {
  return NextResponse.json({ error: reason }, { status: 503 });
}

async function paidHandler(req: NextRequest): Promise<NextResponse<unknown>> {
  if (!hasDurableClearingStore()) {
    return unavailable("DATABASE_URL is required for testnet settlement");
  }
  const secret = process.env.AGENT_HMAC_SECRET;
  const expectedAgentId = process.env.CLEARING_AGENT_ID;
  const expectedWallet = process.env.CLEARING_AGENT_WALLET as `0x${string}` | undefined;
  if (!secret || !expectedAgentId || !expectedWallet) {
    return unavailable("Agent HMAC identity is not configured");
  }
  const payment = decodePaymentPayload(req.headers.get(PAYMENT_SIGNATURE_HEADER));
  const payer = payment?.payload.authorization.from;
  const auth = verifyAgentRequest({
    request: req,
    secret,
    expectedAgentId,
    expectedWallet,
    paymentPayer: payer,
  });
  const repository = getClearingRepository();
  if (!auth.ok) {
    await writeAudit({
      event: "agent.authentication",
      actor: req.headers.get("X-Lumen-Agent-Id") ?? "unknown",
      outcome: "deny",
      details: { reason: auth.reason },
    });
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }
  const reserved = await repository.reserveAuthNonce(
    auth.auth.agentId,
    auth.auth.nonce,
    new Date(Date.now() + 5 * 60 * 1000),
  );
  if (!reserved) {
    await writeAudit({
      event: "agent.nonce_replay",
      actor: auth.auth.agentId,
      outcome: "deny",
    });
    return NextResponse.json({ error: "Agent authentication nonce already used" }, { status: 409 });
  }
  const allowed = await repository.consumeRateLimit(`agent:${auth.auth.agentId}`, 60, 60);
  if (!allowed) {
    await writeAudit({
      event: "agent.rate_limit",
      actor: auth.auth.agentId,
      outcome: "deny",
    });
    return NextResponse.json({ error: "Agent rate limit exceeded" }, { status: 429 });
  }
  await writeAudit({
    event: "agent.authentication",
    actor: auth.auth.agentId,
    outcome: "allow",
    details: { payer },
  });
  return NextResponse.json({
    status: "success",
    mode: "testnet",
    data: {
      alpha_intel:
        "This resource was authorized by a KYA-bound agent and settled by an x402 facilitator.",
      asset: new URL(req.url).searchParams.get("asset") === "usdt" ? "usdt" : "usdc",
    },
  });
}

const merchant = process.env.CLEARING_MERCHANT_ADDRESS as `0x${string}` | undefined;
const defaultFacilitator = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
const usdtFacilitator = process.env.X402_USDT_FACILITATOR_URL;

const usdcHandler = merchant
  ? withX402(
      paidHandler,
      {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: "eip155:84532",
          payTo: merchant,
        },
        description: "Lumen A2A premium intelligence",
        mimeType: "application/json",
        serviceName: "Lumen Clearing",
        tags: ["a2a", "usdc"],
      },
      getX402Server(defaultFacilitator),
    )
  : () => unavailable("CLEARING_MERCHANT_ADDRESS is required");

const usdtHandler =
  merchant && usdtFacilitator
    ? withX402(
        paidHandler,
        {
          accepts: {
            scheme: "exact",
            price: {
              asset: tokenFor("eip155:2201", "usdt"),
              amount: "10000",
              extra: {
                name: "USDT0",
                version: "1",
                assetTransferMethod: "permit2",
              },
            },
            network: "eip155:2201",
            payTo: merchant,
          },
          description: "Lumen A2A premium intelligence",
          mimeType: "application/json",
          serviceName: "Lumen Clearing",
          tags: ["a2a", "usdt"],
        },
        getX402Server(usdtFacilitator),
      )
    : () => unavailable("USDT testnet requires X402_USDT_FACILITATOR_URL");

export async function GET(req: NextRequest) {
  const mode = getClearingMode();
  if (mode !== "testnet") {
    return unavailable(
      mode === "demo"
        ? "Use /api/clearing/demo/intel for the explicitly simulated flow."
        : "Mainnet settlement must use the gated release route.",
    );
  }
  return new URL(req.url).searchParams.get("asset") === "usdt"
    ? usdtHandler(req)
    : usdcHandler(req);
}
