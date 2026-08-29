import { signAgentRequest, verifyAgentRequest } from "../lib/clearing/auth";
import { MemoryClearingRepository } from "../lib/clearing/repository";

async function main() {
  const results: Array<{ name: string; pass: boolean; detail: string }> = [];
  const check = (name: string, pass: boolean, detail: string) =>
    results.push({ name, pass, detail });
  const secret = "test-secret-that-is-never-used-outside-this-process";
  const url = "http://localhost/api/clearing/intel?asset=usdc";
  const timestamp = Date.now();
  const headers = signAgentRequest({
    secret,
    agentId: "agent-1",
    method: "GET",
    url,
    timestamp,
    nonce: "auth-nonce-1",
  });

  const valid = verifyAgentRequest({
    request: new Request(url, { headers }),
    secret,
    expectedAgentId: "agent-1",
    expectedWallet: "0x1111111111111111111111111111111111111111",
    paymentPayer: "0x1111111111111111111111111111111111111111",
    now: timestamp,
  });
  check("accept valid HMAC", valid.ok, valid.ok ? valid.auth.agentId : valid.reason);

  const tampered = verifyAgentRequest({
    request: new Request(`${url}&tampered=1`, { headers }),
    secret,
    now: timestamp,
  });
  check("reject tampered path", !tampered.ok, tampered.ok ? "accepted" : tampered.reason);

  const expiredHeaders = signAgentRequest({
    secret,
    agentId: "agent-1",
    method: "GET",
    url,
    timestamp: timestamp - 10 * 60 * 1000,
    nonce: "auth-nonce-expired",
  });
  const expired = verifyAgentRequest({
    request: new Request(url, { headers: expiredHeaders }),
    secret,
    now: timestamp,
  });
  check("reject stale HMAC", !expired.ok, expired.ok ? "accepted" : expired.reason);

  const wrongPayer = verifyAgentRequest({
    request: new Request(url, { headers }),
    secret,
    expectedAgentId: "agent-1",
    expectedWallet: "0x1111111111111111111111111111111111111111",
    paymentPayer: "0x2222222222222222222222222222222222222222",
    now: timestamp,
  });
  check("bind payer to identity", !wrongPayer.ok, wrongPayer.ok ? "accepted" : wrongPayer.reason);

  const repository = new MemoryClearingRepository();
  const firstNonce = await repository.reserveAuthNonce(
    "agent-1",
    "nonce-1",
    new Date(Date.now() + 60_000),
  );
  const replayNonce = await repository.reserveAuthNonce(
    "agent-1",
    "nonce-1",
    new Date(Date.now() + 60_000),
  );
  check("reserve auth nonce once", firstNonce && !replayNonce, String({ firstNonce, replayNonce }));

  const rateOne = await repository.consumeRateLimit("agent-1", 1, 60);
  const rateTwo = await repository.consumeRateLimit("agent-1", 1, 60);
  check("enforce rate limit", rateOne && !rateTwo, String({ rateOne, rateTwo }));

  for (const result of results) {
    console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.name}  ${result.detail}`);
  }
  if (results.some((result) => !result.pass)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
