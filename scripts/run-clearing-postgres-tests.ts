import { Pool } from "pg";
import { getClearingRepository } from "../lib/clearing/repository";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("SKIP  PostgreSQL integration  DATABASE_URL is not set");
    return;
  }
  const repository = getClearingRepository();
  if (!(await repository.ready())) throw new Error("Clearing schema is not ready");
  const id = crypto.randomUUID();
  const first = await repository.reserveAuthNonce("integration-agent", id, new Date(Date.now() + 60_000));
  const replay = await repository.reserveAuthNonce("integration-agent", id, new Date(Date.now() + 60_000));
  if (!first || replay) throw new Error("PostgreSQL nonce uniqueness failed");

  const key = `integration:${id}`;
  const rateOne = await repository.consumeRateLimit(key, 1, 60);
  const rateTwo = await repository.consumeRateLimit(key, 1, 60);
  if (!rateOne || rateTwo) throw new Error("PostgreSQL rate limit failed");

  const txHash = `0x${id.replace(/-/g, "").padEnd(64, "0")}`;
  await repository.recordSettlement({
    paymentIdentifier: `payment-${id}`,
    agentId: "integration-agent",
    taskId: `task-${id}`,
    payer: "0x1111111111111111111111111111111111111111",
    payTo: "0x2222222222222222222222222222222222222222",
    asset: "usdc",
    network: "eip155:84532",
    amountAtomic: "10000",
    txHash,
    status: "settled",
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const settlement = await pool.query(
      "SELECT status FROM clearing_settlements WHERE tx_hash = $1",
      [txHash],
    );
    const ledger = await pool.query(
      "SELECT amount_atomic FROM clearing_ledger_entries WHERE settlement_tx_hash = $1",
      [txHash],
    );
    if (settlement.rows[0]?.status !== "settled" || ledger.rows[0]?.amount_atomic !== "10000") {
      throw new Error("Settlement and ledger were not atomically persisted");
    }
  } finally {
    await pool.end();
  }
  console.log("PASS  PostgreSQL nonce, rate limit, settlement, and ledger");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
