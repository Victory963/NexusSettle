import { NextResponse } from "next/server";
import { getProject } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const lines = [
    "ffconcat version 1.0",
    ...project.plan.shots
      .filter((s) => s.status === "passed")
      .map((s) => `file shots/${s.id}/take.mp4`),
  ];
  const script = `#!/usr/bin/env bash
# Lumen assemble — hard-cut default. Identity is locked by bible + adapters, not by temporal continuity.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
cat > /tmp/lumen-${project.id}.ffconcat <<'EOF'
${lines.join("\n")}
EOF
ffmpeg -y -f concat -safe 0 -i /tmp/lumen-${project.id}.ffconcat -c:v libx264 -r 24 -pix_fmt yuv420p post/out/${project.id}.mp4
`;
  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="concat-${project.id}.sh"`,
    },
  });
}
