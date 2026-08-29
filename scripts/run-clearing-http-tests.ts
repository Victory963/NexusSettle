import { GET as getDemoIntel } from "../app/api/clearing/demo/intel/route";
import { GET as getLiveIntel } from "../app/api/clearing/intel/route";
import { encodePaymentPayload, type X402PaymentRequired } from "../lib/clearing/x402";

process.env.CLEARING_MODE = "demo";

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];
const check = (name: string, pass: boolean, detail: string) => {
  results.push({ name, pass, detail });
};

async function main() {
const url = "http://localhost/api/clearing/demo/intel?asset=usdc";
const initial = await getDemoIntel(new Request(url));
const challenge = (await initial.json()) as X402PaymentRequired;
check("demo emits HTTP 402", initial.status === 402, String(initial.status));
check(
  "demo emits PAYMENT-REQUIRED",
  Boolean(initial.headers.get("PAYMENT-REQUIRED")),
  initial.headers.get("PAYMENT-REQUIRED") ? "present" : "missing",
);

const randomHashOnly = await getDemoIntel(
  new Request(url, { headers: { "X-402-Tx-Hash": `0x${"1".repeat(64)}` } }),
);
check("random tx hash cannot unlock", randomHashOnly.status === 402, String(randomHashOnly.status));

const buyer = "0xab5801a7d398351b8be11c439e05c5b3259aec9b" as const;
const now = Math.floor(Date.now() / 1000);
const accepted = challenge.accepts[0];

function paymentHeader(from: `0x${string}`, nonce: string) {
  return encodePaymentPayload({
    x402Version: 2,
    resource: challenge.resource,
    accepted,
    payload: {
      signature: `0x${"00".repeat(65)}`,
      authorization: {
        from,
        to: accepted.payTo,
        value: accepted.amount,
        validAfter: String(now - 5),
        validBefore: String(now + 60),
        nonce,
      },
    },
    extensions: {},
  });
}

async function pay(input: { from: `0x${string}`; nonce: string; paymentId: string }) {
  return getDemoIntel(
    new Request(url, {
      headers: {
        "PAYMENT-SIGNATURE": paymentHeader(input.from, input.nonce),
        "X-Lumen-Agent-Id": "agent-buyer-research",
        "X-Lumen-Task-Id": `task-${input.paymentId}`,
        "Payment-Identifier": input.paymentId,
      },
    }),
  );
}

const wrongPayer = await pay({
  from: "0x000000000000000000000000000000000000dEaD",
  nonce: `nonce-${crypto.randomUUID()}`,
  paymentId: `wrong-${crypto.randomUUID()}`,
});
check("HTTP rejects wrong payer", wrongPayer.status === 400, String(wrongPayer.status));

const nonce = `nonce-${crypto.randomUUID()}`;
const paymentId = `valid-${crypto.randomUUID()}`;
const paid = await pay({ from: buyer, nonce, paymentId });
check("HTTP accepts policy payment", paid.status === 200, String(paid.status));
check(
  "HTTP emits PAYMENT-RESPONSE",
  Boolean(paid.headers.get("PAYMENT-RESPONSE")),
  paid.headers.get("PAYMENT-RESPONSE") ? "present" : "missing",
);

const replay = await pay({ from: buyer, nonce, paymentId });
check("HTTP rejects replay", replay.status === 409, String(replay.status));

const live = await getLiveIntel(new Request("http://localhost/api/clearing/intel"));
check("live route rejects synthetic settlement", live.status === 503, String(live.status));

for (const result of results) {
  console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.name}  ${result.detail}`);
}
if (results.some((result) => !result.pass)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
