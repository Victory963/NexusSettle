import { Pool } from "pg";

export type SettlementRecord = {
  paymentIdentifier: string;
  agentId: string;
  taskId: string;
  payer: string;
  payTo: string;
  asset: string;
  network: string;
  amountAtomic: string;
  txHash: string;
  status: "settled" | "failed" | "pending";
  errorReason?: string;
};

export type AuditRecord = {
  event: string;
  actor: string;
  outcome: "allow" | "deny" | "error";
  details?: Record<string, unknown>;
};

export interface ClearingRepository {
  ready(): Promise<boolean>;
  reserveAuthNonce(agentId: string, nonce: string, expiresAt: Date): Promise<boolean>;
  consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
  recordSettlement(record: SettlementRecord): Promise<void>;
  recordAudit(record: AuditRecord): Promise<void>;
}

export class MemoryClearingRepository implements ClearingRepository {
  private readonly nonces = new Set<string>();
  private readonly windows = new Map<string, { start: number; count: number }>();
  readonly settlements: SettlementRecord[] = [];
  readonly audits: AuditRecord[] = [];

  async ready() {
    return true;
  }

  async reserveAuthNonce(agentId: string, nonce: string) {
    const key = `${agentId}:${nonce}`;
    if (this.nonces.has(key)) return false;
    this.nonces.add(key);
    return true;
  }

  async consumeRateLimit(key: string, limit: number, windowSeconds: number) {
    const now = Date.now();
    const current = this.windows.get(key);
    if (!current || now - current.start >= windowSeconds * 1000) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  }

  async recordSettlement(record: SettlementRecord) {
    if (!this.settlements.some((item) => item.txHash === record.txHash)) {
      this.settlements.push(record);
    }
  }

  async recordAudit(record: AuditRecord) {
    this.audits.push(record);
  }
}

class PostgresClearingRepository implements ClearingRepository {
  constructor(private readonly pool: Pool) {}

  async ready() {
    try {
      await this.pool.query("SELECT 1 FROM clearing_settlements LIMIT 1");
      return true;
    } catch {
      return false;
    }
  }

  async reserveAuthNonce(agentId: string, nonce: string, expiresAt: Date) {
    const result = await this.pool.query(
      `INSERT INTO clearing_auth_nonces (agent_id, nonce, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING nonce`,
      [agentId, nonce, expiresAt],
    );
    return result.rowCount === 1;
  }

  async consumeRateLimit(key: string, limit: number, windowSeconds: number) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ count: number; window_start: Date }>(
        `SELECT count, window_start
         FROM clearing_rate_limits
         WHERE key = $1
         FOR UPDATE`,
        [key],
      );
      const now = new Date();
      const current = result.rows[0];
      if (!current || now.getTime() - current.window_start.getTime() >= windowSeconds * 1000) {
        await client.query(
          `INSERT INTO clearing_rate_limits (key, window_start, count)
           VALUES ($1, $2, 1)
           ON CONFLICT (key) DO UPDATE SET window_start = EXCLUDED.window_start, count = 1`,
          [key, now],
        );
        await client.query("COMMIT");
        return true;
      }
      if (current.count >= limit) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query("UPDATE clearing_rate_limits SET count = count + 1 WHERE key = $1", [key]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordSettlement(record: SettlementRecord) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO clearing_settlements
          (payment_identifier, agent_id, task_id, payer, pay_to, asset, network,
           amount_atomic, tx_hash, status, error_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (tx_hash) DO NOTHING`,
        [
          record.paymentIdentifier,
          record.agentId,
          record.taskId,
          record.payer,
          record.payTo,
          record.asset,
          record.network,
          record.amountAtomic,
          record.txHash,
          record.status,
          record.errorReason ?? null,
        ],
      );
      if (record.status === "settled") {
        await client.query(
          `INSERT INTO clearing_ledger_entries
            (settlement_tx_hash, debit_account, credit_account, asset, amount_atomic)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (settlement_tx_hash) DO NOTHING`,
          [record.txHash, record.payer, record.payTo, record.asset, record.amountAtomic],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordAudit(record: AuditRecord) {
    await this.pool.query(
      `INSERT INTO clearing_audit_events (event, actor, outcome, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [record.event, record.actor, record.outcome, JSON.stringify(record.details ?? {})],
    );
  }
}

const memoryRepository = new MemoryClearingRepository();
let postgresRepository: PostgresClearingRepository | undefined;

export function hasDurableClearingStore() {
  return Boolean(process.env.DATABASE_URL);
}

export function getClearingRepository(): ClearingRepository {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return memoryRepository;
  if (!postgresRepository) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.CLEARING_DB_POOL_SIZE ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.CLEARING_DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
    postgresRepository = new PostgresClearingRepository(pool);
  }
  return postgresRepository;
}
