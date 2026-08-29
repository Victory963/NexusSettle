import { getClearingRepository, type AuditRecord } from "./repository";

const SECRET_KEYS = /secret|authorization|signature|api[_-]?key/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEYS.test(key) ? "[REDACTED]" : redact(item),
    ]),
  );
}

export async function writeAudit(record: AuditRecord) {
  const safeRecord = {
    ...record,
    details: redact(record.details ?? {}) as Record<string, unknown>,
    at: new Date().toISOString(),
  };
  console.info(JSON.stringify({ type: "clearing_audit", ...safeRecord }));
  await getClearingRepository().recordAudit(safeRecord);
}
