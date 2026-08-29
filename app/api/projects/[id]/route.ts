import { NextResponse } from "next/server";
import { applyElapsedProgress, getProject, saveProject } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.startedAt && project.status !== "ready" && project.status !== "draft") {
    project = saveProject(applyElapsedProgress(project));
  }
  return NextResponse.json(project);
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { action?: string; shotId?: string };
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (body.action === "run") {
    project.status = "queued";
    project.startedAt = Date.now();
    saveProject(project);
    return NextResponse.json({ ok: true, status: project.status });
  }
  if (body.action === "retry" && body.shotId) {
    const shot = project.plan.shots.find((s) => s.id === body.shotId);
    if (!shot) return NextResponse.json({ error: "shot not found" }, { status: 404 });
    shot.status = "retry";
    shot.takes += 1;
    shot.seed = (shot.seed + 17) >>> 0;
    saveProject(project);
    return NextResponse.json({ ok: true, shot });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
