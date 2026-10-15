import { withX402 } from "@x402/next";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyAgentRequest } from "@/lib/clearing/auth";
import { writeAudit } from "@/lib/clearing/audit";
import { tokenFor } from "@/lib/clearing/assets";
import { getClearingMode } from "@/lib/clearing/config";
import { evaluateMainnetGate } from "@/lib/clearing/mainnet-gate";
import {
  getClearingRepository,
  hasDurableClearingStore,
} from "@/lib/clearing/repository";
import { decodePaymentPayload, PAYMENT_SIGNATURE_HEADER } from "@/lib/clearing/x402";
import { getX402Server } from "@/lib/clearing/x402-server";

async function unavailable(reason: string, details?: string[]): Promise<NextResponse<unknown>> {
  return NextResponse.json({ error: reason, details }, { status: 503 });
}

async function paidHandler(req: NextRequest, rail: "testnet" | "mainnet"): Promise<NextResponse<unknown>> {
  if (!hasDurableClearingStore()) {
    return unavailable("DATABASE_URL is required for live settlement");
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
      details: { reason: auth.reason, rail },
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
      details: { rail },
    });
    return NextResponse.json({ error: "Agent authentication nonce already used" }, { status: 409 });
  }
  const allowed = await repository.consumeRateLimit(`agent:${auth.auth.agentId}`, 60, 60);
  if (!allowed) {
    await writeAudit({
      event: "agent.rate_limit",
      actor: auth.auth.agentId,
      outcome: "deny",
      details: { rail },
    });
    return NextResponse.json({ error: "Agent rate limit exceeded" }, { status: 429 });
  }
  await writeAudit({
    event: "agent.authentication",
    actor: auth.auth.agentId,
    outcome: "allow",
    details: { payer, rail },
  });
  return NextResponse.json({
    status: "success",
    mode: rail,
    data: {
      alpha_intel:
        rail === "mainnet"
          ? "Mainnet resource unlocked after dual-approval gate, KYB attestation, and facilitator settlement."
          : "This resource was authorized by a KYA-bound agent and settled by an x402 facilitator.",
      asset: new URL(req.url).searchParams.get("asset") === "usdt" ? "usdt" : "usdc",
    },
  });
}

const merchant = process.env.CLEARING_MERCHANT_ADDRESS as `0x${string}` | undefined;
const defaultFacilitator = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
const usdtFacilitator = process.env.X402_USDT_FACILITATOR_URL;

function buildUsdcHandler(network: "eip155:84532" | "eip155:8453", facilitatorUrl: string, rail: "testnet" | "mainnet") {
  if (!merchant) return () => unavailable("CLEARING_MERCHANT_ADDRESS is required");
  const canary = rail === "mainnet" ? process.env.CLEARING_CANARY_MAX_ATOMIC : undefined;
  return withX402(
    (req) => paidHandler(req, rail),
    {
      accepts: {
        scheme: "exact",
        price: canary && Number(canary) > 0
          ? {
              asset: tokenFor("eip155:8453", "usdc"),
              amount: canary,
              extra: { name: "USD Coin", version: "2" },
            }
          : "$0.01",
        network,
        payTo: merchant,
      },
      description: "NexusSettle premium intelligence",
      mimeType: "application/json",
      serviceName: "NexusSettle",
      tags: ["a2a", "usdc", rail],
    },
    getX402Server(facilitatorUrl),
  );
}

const testnetUsdc = buildUsdcHandler("eip155:84532", defaultFacilitator, "testnet");
const mainnetUsdc = buildUsdcHandler(
  "eip155:8453",
  process.env.X402_FACILITATOR_URL ?? "",
  "mainnet",
);

const usdtHandler =
  merchant && usdtFacilitator
    ? withX402(
        (req) => paidHandler(req, "testnet"),
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
          description: "NexusSettle premium intelligence",
          mimeType: "application/json",
          serviceName: "NexusSettle",
          tags: ["a2a", "usdt"],
        },
        getX402Server(usdtFacilitator),
      )
    : () => unavailable("USDT testnet requires X402_USDT_FACILITATOR_URL");

export async function GET(req: NextRequest) {
  if (process.env.CLEARING_KILL_SWITCH === "true") {
    return unavailable("CLEARING_KILL_SWITCH is engaged");
  }

  const mode = getClearingMode();
  if (mode === "demo") {
    return unavailable("Use /api/clearing/demo/intel for the explicitly simulated flow.");
  }

  if (mode === "mainnet") {
    const gate = evaluateMainnetGate();
    if (!gate.ok) {
      await writeAudit({
        event: "mainnet.gate_deny",
        actor: process.env.CLEARING_AGENT_ID ?? "unknown",
        outcome: "deny",
        details: { reasons: gate.reasons },
      });
      return unavailable("Mainnet release gate is closed", gate.reasons);
    }
    if (new URL(req.url).searchParams.get("asset") === "usdt") {
      return unavailable(
        "Mainnet USDT requires a production facilitator Permit2 attestation; leave unset until verified.",
      );
    }
    return mainnetUsdc(req);
  }

  return new URL(req.url).searchParams.get("asset") === "usdt" ? usdtHandler(req) : testnetUsdc(req);
}
