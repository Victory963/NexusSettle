"use client";

import { useCallback, useEffect, useState } from "react";

type Agent = {
  id: string;
  displayName: string;
  role: string;
  ownerDid: string;
  wallet: string;
  reputation: number;
};

type LedgerRow = {
  id: string;
  at: number;
  kind: string;
  fromAgentId: string;
  toAgentId: string;
  asset: string;
  amountAtomic: string;
  txHash: string;
  note: string;
};

type TestRow = { name: string; pass: boolean; detail: string };
type Readiness = { ready: boolean; mode: "demo" | "testnet" | "mainnet" };

function atomicUsd(v: string) {
  return (Number(v) / 1e6).toFixed(4);
}

export function ClearingDesk() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [balances, setBalances] = useState<Record<string, { usdc: string; usdt: string }>>({});
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [log, setLog] = useState<string>("Ready.");
  const [asset, setAsset] = useState<"usdc" | "usdt">("usdc");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [a, l, h, r] = await Promise.all([
      fetch("/api/clearing/agents").then((r) => r.json()),
      fetch("/api/clearing/ledger").then((r) => r.json()),
      fetch("/api/clearing/health").then((r) => r.json()),
      fetch("/api/clearing/ready").then((r) => r.json()),
    ]);
    setAgents(a.agents ?? []);
    setBalances(l.balances ?? a.balances ?? {});
    setLedger(l.ledger ?? []);
    setTests(h.tests ?? []);
    setReadiness(r);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  async function simulate(scheme: "exact" | "batch-settlement" | "outcome-escrow", extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch("/api/clearing/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheme, asset, ...extra }),
      });
      const data = await res.json();
      setLog(JSON.stringify(data, null, 2));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function demo402() {
    setBusy(true);
    try {
      const first = await fetch(`/api/clearing/demo/intel?asset=${asset}`);
      const challenge = await first.json();
      if (first.status !== 402) {
        setLog(JSON.stringify({ unexpected: first.status, challenge }, null, 2));
        return;
      }
      const buyer = agents.find((agent) => agent.role === "buyer");
      const accepted = challenge.accepts?.[0];
      if (!buyer || !accepted) {
        setLog("Demo buyer or payment requirement is missing.");
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const nonce = `0x${crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")}`;
      const paymentIdentifier = crypto.randomUUID();
      const paymentPayload = {
        x402Version: 2,
        resource: challenge.resource,
        accepted,
        payload: {
          signature: `0x${"00".repeat(65)}`,
          authorization: {
            from: buyer.wallet,
            to: accepted.payTo,
            value: accepted.amount,
            validAfter: String(now - 5),
            validBefore: String(now + 60),
            nonce,
          },
        },
        extensions: {},
      };
      const retry = await fetch(`/api/clearing/demo/intel?asset=${asset}`, {
        headers: {
          "PAYMENT-SIGNATURE": btoa(JSON.stringify(paymentPayload)),
          "X-Lumen-Agent-Id": buyer.id,
          "X-Lumen-Task-Id": crypto.randomUUID(),
          "Payment-Identifier": paymentIdentifier,
        },
      });
      const payload = await retry.json();
      setLog(
        JSON.stringify(
          {
            step1: {
              status: first.status,
              paymentRequired: first.headers.get("PAYMENT-REQUIRED"),
              challenge,
            },
            step2: {
              status: retry.status,
              paymentResponse: retry.headers.get("PAYMENT-RESPONSE"),
              payload,
            },
          },
          null,
          2,
        ),
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/20 bg-amber-200/8 px-4 py-3 text-sm"
      >
        <span>
          Rail: <strong className="uppercase text-amber-100">{readiness?.mode ?? "loading"}</strong>
          {readiness?.mode === "demo" ? " — synthetic evidence only; no funds move" : ""}
        </span>
        <span className={readiness?.ready ? "text-emerald-300" : "text-rose-300"}>
          {readiness?.ready ? "READY" : "NOT READY"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-white/60">
          Asset
          <select
            className="ml-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-white"
            value={asset}
            onChange={(e) => setAsset(e.target.value as "usdc" | "usdt")}
          >
            <option value="usdc">USDC</option>
            <option value="usdt">USDT</option>
          </select>
        </label>
        <button disabled={busy} className="rounded-full bg-amber-200 px-4 py-1.5 text-sm text-black disabled:opacity-40" onClick={() => void simulate("exact")}>
          Exact A2A
        </button>
        <button disabled={busy} className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40" onClick={() => void simulate("batch-settlement")}>
          Batch 12×
        </button>
        <button disabled={busy} className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40" onClick={() => void simulate("outcome-escrow", { succeed: true })}>
          Outcome release
        </button>
        <button disabled={busy} className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40" onClick={() => void simulate("outcome-escrow", { succeed: false })}>
          Outcome refund
        </button>
        <button disabled={busy} className="rounded-full border border-amber-200/40 px-4 py-1.5 text-sm text-amber-100 disabled:opacity-40" onClick={() => void demo402()}>
          Demo HTTP 402
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => {
          const bal = balances[agent.id] ?? { usdc: "0", usdt: "0" };
          return (
            <article key={agent.id} className="rounded-3xl border border-white/10 bg-white/4 p-6">
              <div className="text-xs tracking-[0.2em] text-amber-200/80">{agent.role.toUpperCase()}</div>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">{agent.displayName}</h2>
              <p className="mt-3 break-all text-xs text-white/40">{agent.wallet}</p>
              <p className="mt-1 text-xs text-white/40">{agent.ownerDid}</p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  USDC <span className="text-white">{atomicUsd(bal.usdc)}</span>
                </div>
                <div>
                  USDT <span className="text-white">{atomicUsd(bal.usdt)}</span>
                </div>
                <div>
                  Rep <span className="text-white">{agent.reputation}</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Guardrail tests</h2>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {tests.map((t) => (
            <li key={t.name} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <span className={t.pass ? "text-emerald-300" : "text-rose-300"}>{t.pass ? "PASS" : "FAIL"}</span>
              <span className="ml-2 text-white/80">{t.name}</span>
              <div className="mt-1 truncate text-xs text-white/40">{t.detail}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article>
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Ledger</h2>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-auto">
            {ledger.length === 0 && <p className="text-sm text-white/40">No settlements yet.</p>}
            {ledger.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-sm">
                <div className="flex justify-between text-white/70">
                  <span>{row.kind}</span>
                  <span>
                    {atomicUsd(row.amountAtomic)} {row.asset.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">{row.note}</p>
              </div>
            ))}
          </div>
        </article>
        <article>
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Last response</h2>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-3xl border border-white/10 bg-black/40 p-4 text-xs leading-5 text-white/70">
            {log}
          </pre>
        </article>
      </section>
    </div>
  );
}
