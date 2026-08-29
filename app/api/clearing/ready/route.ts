import { NextResponse } from "next/server";
import { getClearingMode } from "@/lib/clearing/config";
import {
  getClearingRepository,
  hasDurableClearingStore,
} from "@/lib/clearing/repository";

export async function GET() {
  try {
    const mode = getClearingMode();
    const durable = hasDurableClearingStore();
    const databaseReady = durable ? await getClearingRepository().ready() : mode === "demo";
    const merchantReady = mode === "demo" || Boolean(process.env.CLEARING_MERCHANT_ADDRESS);
    const ready = databaseReady && merchantReady;
    return NextResponse.json(
      {
        ready,
        mode,
        checks: {
          durableStore: durable,
          database: databaseReady,
          merchant: merchantReady,
          facilitator:
            mode === "demo" || Boolean(process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator"),
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
