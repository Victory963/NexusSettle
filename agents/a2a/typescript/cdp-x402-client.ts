import { CdpEvmWalletProvider } from "@coinbase/agentkit";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { signAgentRequest } from "../../../lib/clearing/auth";
import { sameAddr, tokenFor } from "../../../lib/clearing/assets";

type ClientSigner = ConstructorParameters<typeof ExactEvmScheme>[0];

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function withAgentAuthentication(
  baseFetch: typeof fetch,
  input: { secret: string; agentId: string },
): typeof fetch {
  return async (requestInput, init = {}) => {
    const request = requestInput instanceof Request ? requestInput : undefined;
    const url =
      typeof requestInput === "string" || requestInput instanceof URL
        ? String(requestInput)
        : requestInput.url;
    const method = init.method ?? request?.method ?? "GET";
    const body = typeof init.body === "string" ? init.body : "";
    const headers = new Headers(request?.headers);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    const signed = signAgentRequest({
      secret: input.secret,
      agentId: input.agentId,
      method,
      url,
      body,
    });
    for (const [key, value] of Object.entries(signed)) headers.set(key, value);
    return baseFetch(requestInput, { ...init, headers });
  };
}

export async function createCdpX402Fetch() {
  const provider = await CdpEvmWalletProvider.configureWithWallet({
    apiKeyId: required("CDP_API_KEY_ID"),
    apiKeySecret: required("CDP_API_KEY_SECRET"),
    walletSecret: required("CDP_WALLET_SECRET"),
    address: process.env.CDP_WALLET_ADDRESS as `0x${string}` | undefined,
    idempotencyKey: process.env.CDP_WALLET_IDEMPOTENCY_KEY,
    networkId: "base-sepolia",
  });
  const signer: ClientSigner = {
    address: provider.getAddress() as `0x${string}`,
    signTypedData: (message) => provider.signTypedData(message),
  };
  const merchant = required("CLEARING_MERCHANT_ADDRESS");
  const maxAtomic = BigInt(process.env.CLEARING_MAX_PER_PAYMENT_ATOMIC ?? "500000");
  const client = new x402Client()
    .register("eip155:84532", new ExactEvmScheme(signer))
    .register(
      "eip155:2201",
      new ExactEvmScheme(signer, { rpcUrl: process.env.STABLE_TESTNET_RPC_URL }),
    )
    .setSpendControls({
      maxAmountPerPayment: "$0.50",
      allowedAssets: [
        {
          network: "eip155:2201",
          asset: tokenFor("eip155:2201", "usdt"),
          maxAmountPerPayment: maxAtomic.toString(),
        },
      ],
    })
    .registerPolicy((_version, requirements) =>
      requirements.filter(
        (requirement) =>
          (requirement.network === "eip155:84532" || requirement.network === "eip155:2201") &&
          sameAddr(requirement.payTo, merchant) &&
          BigInt(requirement.amount) <= maxAtomic,
      ),
    );

  return wrapFetchWithPayment(
    withAgentAuthentication(fetch, {
      secret: required("AGENT_HMAC_SECRET"),
      agentId: required("CLEARING_AGENT_ID"),
    }),
    client,
  );
}

export async function payForIntel(asset: "usdc" | "usdt" = "usdc") {
  const baseUrl = process.env.LUMEN_CLEARING_URL ?? "http://localhost:3000";
  const paidFetch = await createCdpX402Fetch();
  const response = await paidFetch(`${baseUrl}/api/clearing/intel?asset=${asset}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`x402 request failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return {
    data,
    settlement: response.headers.get("PAYMENT-RESPONSE"),
  };
}

if (process.argv[1]?.endsWith("cdp-x402-client.ts")) {
  payForIntel(process.argv[2] === "usdt" ? "usdt" : "usdc")
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
