import { NextResponse } from "next/server";
import { loadClearing, saveClearing } from "@/lib/clearing/store";
import { seedDemo } from "@/lib/clearing/orchestrator";
import { balances } from "@/lib/clearing/ledger";
import { runClearingSelfTests } from "@/lib/clearing/self-test";

export async function GET() {
  const state = saveClearing(seedDemo(loadClearing()));
  return NextResponse.json({
    agents: state.agents,
    policies: state.policies,
    balances: balances(state),
    selfTests: runClearingSelfTests(),
  });
}
