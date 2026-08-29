CREATE TABLE IF NOT EXISTS clearing_agents (
  id text PRIMARY KEY,
  owner_did text NOT NULL,
  wallet text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clearing_policies (
  id uuid PRIMARY KEY,
  agent_id text NOT NULL REFERENCES clearing_agents(id),
  policy jsonb NOT NULL,
  valid_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clearing_auth_nonces (
  agent_id text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, nonce)
);

CREATE TABLE IF NOT EXISTS clearing_settlements (
  payment_identifier text NOT NULL UNIQUE,
  agent_id text NOT NULL,
  task_id text NOT NULL,
  payer text NOT NULL,
  pay_to text NOT NULL,
  asset text NOT NULL,
  network text NOT NULL,
  amount_atomic numeric(78, 0) NOT NULL CHECK (amount_atomic > 0),
  tx_hash text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('pending', 'settled', 'failed')),
  error_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE TABLE IF NOT EXISTS clearing_ledger_entries (
  id bigserial PRIMARY KEY,
  settlement_tx_hash text NOT NULL UNIQUE REFERENCES clearing_settlements(tx_hash),
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  asset text NOT NULL,
  amount_atomic numeric(78, 0) NOT NULL CHECK (amount_atomic > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clearing_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL CHECK (count >= 0)
);

CREATE TABLE IF NOT EXISTS clearing_audit_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  actor text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('allow', 'deny', 'error')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clearing_auth_nonces_expiry_idx
  ON clearing_auth_nonces (expires_at);

CREATE INDEX IF NOT EXISTS clearing_settlements_agent_created_idx
  ON clearing_settlements (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS clearing_audit_created_idx
  ON clearing_audit_events (created_at DESC);
