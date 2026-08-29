import { NextResponse } from "next/server";
import { loadClearing } from "@/lib/clearing/store";
import { balances } from "@/lib/clearing/ledger";

export async function GET() {
  const state = loadClearing();
  return NextResponse.json({
    ledger: state.ledger.slice(0, 50),
    escrows: state.escrows.slice(0, 20),
    batchVouchers: state.batchVouchers.slice(0, 20),
    consumedTx: state.consumedTx.slice(-20),
    balances: balances(state),
  });
}
