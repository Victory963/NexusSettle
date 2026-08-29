import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { writeAudit } from "./audit";
import { getClearingRepository } from "./repository";

const servers = new Map<string, x402ResourceServer>();

type AuthorizationPayload = {
  authorization?: {
    from?: string;
    to?: string;
    value?: string;
    nonce?: string;
  };
};

export function getX402Server(facilitatorUrl: string) {
  const existing = servers.get(facilitatorUrl);
  if (existing) return existing;

  const facilitator = new HTTPFacilitatorClient({
    url: facilitatorUrl,
    timeoutMs: Number(process.env.X402_FACILITATOR_TIMEOUT_MS ?? 25_000),
  });
  const server = new x402ResourceServer(facilitator);
  server.register("eip155:*", new ExactEvmScheme());
  server.onAfterSettle(async (context) => {
    const result = context.result;
    const authorization = (context.paymentPayload.payload as AuthorizationPayload).authorization;
    if (!result.success || !authorization?.from || !authorization.to) return;
    await getClearingRepository().recordSettlement({
      paymentIdentifier: result.transaction,
      agentId: process.env.CLEARING_AGENT_ID ?? "unbound-agent",
      taskId: "x402-exact",
      payer: authorization.from,
      payTo: authorization.to,
      asset: context.requirements.asset,
      network: result.network,
      amountAtomic: result.amount ?? authorization.value ?? context.requirements.amount,
      txHash: result.transaction,
      status: "settled",
    });
  });
  server.onSettleFailure(async (context) => {
    await writeAudit({
      event: "x402.settlement_failed",
      actor: process.env.CLEARING_AGENT_ID ?? "unknown",
      outcome: "error",
      details: {
        network: context.requirements.network,
        asset: context.requirements.asset,
        reason: context.error.message,
      },
    });
  });
  servers.set(facilitatorUrl, server);
  return server;
}
