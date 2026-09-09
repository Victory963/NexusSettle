CREATE TABLE IF NOT EXISTS nexus_accounts (
  id text PRIMARY KEY,
  agent_id text NOT NULL,
  asset text NOT NULL,
  network text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('user', 'platform_clearing', 'fees', 'card_suspense', 'fx_suspense')),
  balance numeric(38, 0) NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 0,
  UNIQUE (agent_id, asset, network, kind)
);

CREATE TABLE IF NOT EXISTS nexus_journal_entries (
  id uuid PRIMARY KEY,
  ext_ref text NOT NULL UNIQUE,
  memo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_postings (
  id uuid PRIMARY KEY,
  entry_id uuid NOT NULL REFERENCES nexus_journal_entries(id),
  account_id text NOT NULL REFERENCES nexus_accounts(id),
  asset text NOT NULL,
  amount numeric(38, 0) NOT NULL
);

CREATE INDEX IF NOT EXISTS nexus_postings_account_idx ON nexus_postings (account_id);
CREATE INDEX IF NOT EXISTS nexus_postings_entry_idx ON nexus_postings (entry_id);

CREATE OR REPLACE FUNCTION nexus_assert_balanced() RETURNS trigger AS $$
BEGIN
  IF (
    SELECT COALESCE(SUM(amount), 0)
    FROM nexus_postings
    WHERE entry_id = NEW.entry_id
  ) <> 0 THEN
    RAISE EXCEPTION 'unbalanced journal entry %', NEW.entry_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nexus_postings_balanced ON nexus_postings;
CREATE CONSTRAINT TRIGGER nexus_postings_balanced
AFTER INSERT ON nexus_postings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION nexus_assert_balanced();

CREATE TABLE IF NOT EXISTS nexus_outbox (
  id bigserial PRIMARY KEY,
  aggregate text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed')),
  idem_key text NOT NULL UNIQUE,
  tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_netting_windows (
  window_id text PRIMARY KEY,
  net jsonb NOT NULL,
  instruction_count integer NOT NULL,
  status text NOT NULL DEFAULT 'computed' CHECK (status IN ('computed', 'submitted', 'confirmed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
