import { NextResponse } from "next/server";
import { getClearingMode } from "@/lib/clearing/config";
import { evaluateMainnetGate } from "@/lib/clearing/mainnet-gate";
import {
  getClearingRepository,
  hasDurableClearingStore,
} from "@/lib/clearing/repository";

export async function GET() {
  try {
    const mode = getClearingMode();
    if (process.env.CLEARING_KILL_SWITCH === "true") {
      return NextResponse.json(
        { ready: false, mode, error: "CLEARING_KILL_SWITCH is engaged" },
        { status: 503 },
      );
    }

    const durable = hasDurableClearingStore();
    const databaseReady = durable ? await getClearingRepository().ready() : mode === "demo";
    const merchantReady = mode === "demo" || Boolean(process.env.CLEARING_MERCHANT_ADDRESS);

    let mainnetGate: { ok: boolean; reasons?: string[] } | undefined;
    if (mode === "mainnet") {
      const gate = evaluateMainnetGate();
      mainnetGate = gate.ok ? { ok: true } : { ok: false, reasons: gate.reasons };
    }

    const ready =
      databaseReady &&
      merchantReady &&
      (mode !== "mainnet" || Boolean(mainnetGate?.ok));

    return NextResponse.json(
      {
        ready,
        mode,
        checks: {
          durableStore: durable,
          database: databaseReady,
          merchant: merchantReady,
          facilitator:
            mode === "demo" ||
            Boolean(
              process.env.X402_FACILITATOR_URL ??
                (mode === "testnet" ? "https://x402.org/facilitator" : undefined),
            ),
          mainnetGate,
          killSwitch: process.env.CLEARING_KILL_SWITCH === "true",
        },
      },
      { status: ready ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      { ready: false, error: error instanceof Error ? error.message : "Unknown readiness error" },
      { status: 503 },
    );
  }
}
