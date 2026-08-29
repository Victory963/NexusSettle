import { evaluateMainnetGate } from "../lib/clearing/mainnet-gate";

const mode = (process.env.CLEARING_MODE ?? "demo").toLowerCase();
const errors: string[] = [];

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) errors.push(`${name} is required`);
  return value ?? "";
}

function address(name: string) {
  const value = required(name);
  if (value && (!/^0x[0-9a-fA-F]{40}$/.test(value) || /^0x0{40}$/i.test(value))) {
    errors.push(`${name} must be a non-zero EVM address`);
  }
}

if (!["demo", "testnet", "mainnet"].includes(mode)) {
  errors.push("CLEARING_MODE must be demo, testnet, or mainnet");
}

if (mode === "mainnet") {
  const gate = evaluateMainnetGate();
  if (!gate.ok) {
    for (const reason of gate.reasons) errors.push(reason);
  }
}

if (mode === "testnet") {
  const databaseUrl = required("DATABASE_URL");
  if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    errors.push("DATABASE_URL must use PostgreSQL");
  }
  address("CLEARING_MERCHANT_ADDRESS");
  address("CLEARING_AGENT_WALLET");
  required("CLEARING_AGENT_ID");
  const secret = required("AGENT_HMAC_SECRET");
  if (secret && (secret.length < 32 || secret.includes("replace-with"))) {
    errors.push("AGENT_HMAC_SECRET must contain at least 32 non-placeholder characters");
  }
  const facilitator = required("X402_FACILITATOR_URL");
  if (facilitator && !facilitator.startsWith("https://")) {
    errors.push("X402_FACILITATOR_URL must use HTTPS");
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR  ${error}`);
  process.exit(1);
}

console.log(`PASS  Clearing configuration is valid for ${mode}`);
