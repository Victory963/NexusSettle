import { NextResponse } from "next/server";
import { runClearingSelfTests } from "@/lib/clearing/self-test";
import { runNexusSelfTests } from "@/lib/nexus/self-test";

export async function GET() {
  const tests = [...runClearingSelfTests(), ...runNexusSelfTests()];
  const failed = tests.filter((t) => !t.pass);
  return NextResponse.json({
    ok: failed.length === 0,
    passed: tests.length - failed.length,
    failed: failed.length,
    tests,
  });
}
