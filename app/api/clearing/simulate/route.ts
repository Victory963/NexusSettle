import { NextResponse } from "next/server";
import { loadClearing, saveClearing } from "@/lib/clearing/store";
import { runBatchA2A, runExactA2A, runOutcomeA2A } from "@/lib/clearing/orchestrator";
import { balances } from "@/lib/clearing/ledger";
import type { StableAsset } from "@/lib/clearing/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    scheme?: "exact" | "batch-settlement" | "outcome-escrow";
    asset?: StableAsset;
    succeed?: boolean;
    calls?: number;
  };
  const asset: StableAsset = body.asset === "usdt" ? "usdt" : "usdc";
  const state = loadClearing();
  const scheme = body.scheme ?? "exact";

  if (scheme === "batch-settlement") {
    const result = runBatchA2A(state, body.calls ?? 12, asset);
    saveClearing(state);
    return NextResponse.json({ ...result, balances: balances(state) });
  }
  if (scheme === "outcome-escrow") {
    const result = runOutcomeA2A(state, body.succeed !== false, asset);
    saveClearing(state);
    return NextResponse.json({ ...result, balances: balances(state) });
  }
  const result = runExactA2A(state, asset);
  saveClearing(state);
  return NextResponse.json({ ...result, balances: balances(state) });
}
