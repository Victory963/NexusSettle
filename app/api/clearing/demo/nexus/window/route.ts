import { NextResponse } from "next/server";
import { getClearingMode } from "@/lib/clearing/config";
import { runNexusWindow } from "@/lib/nexus/window";

export async function POST() {
  if (getClearingMode() !== "demo") {
    return NextResponse.json(
      { error: "NEXUS netting window demo is limited to CLEARING_MODE=demo" },
      { status: 503 },
    );
  }
  return NextResponse.json(runNexusWindow());
}

export async function GET() {
  return POST();
}
