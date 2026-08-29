import { NextResponse } from "next/server";
import { getClearingMode } from "@/lib/clearing/config";

export async function GET() {
  const mode = getClearingMode();
  return NextResponse.json({
    error: "Live settlement rail is not configured",
    mode,
    hint:
      mode === "demo"
        ? "Use /api/clearing/demo/intel for the explicitly simulated flow."
        : "Configure the x402 facilitator and signer before serving paid resources.",
  }, { status: 503 });
}
