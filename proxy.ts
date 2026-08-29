import { NextResponse, type NextRequest } from "next/server";
import { AUTH_HEADERS } from "@/lib/clearing/auth";

export function proxy(request: NextRequest) {
  if (process.env.CLEARING_KILL_SWITCH === "true") {
    return NextResponse.json({ error: "CLEARING_KILL_SWITCH is engaged" }, { status: 503 });
  }

  const mode = process.env.CLEARING_MODE ?? (process.env.NODE_ENV === "production" ? "testnet" : "demo");
  const path = request.nextUrl.pathname;
  if (
    mode === "demo" ||
    path.startsWith("/api/clearing/demo/") ||
    path === "/api/clearing/health" ||
    path === "/api/clearing/ready"
  ) {
    return NextResponse.next();
  }

  if (mode === "mainnet" && process.env.CLEARING_MAINNET_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Mainnet is locked. Run npm run preflight:mainnet and dual approval first." },
      { status: 503 },
    );
  }

  const required = [
    AUTH_HEADERS.agentId,
    AUTH_HEADERS.timestamp,
    AUTH_HEADERS.nonce,
    AUTH_HEADERS.authorization,
  ];
  if (required.some((header) => !request.headers.get(header))) {
    return NextResponse.json(
      { error: "Signed agent authentication headers are required" },
      { status: 401 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/clearing/:path*"],
};
