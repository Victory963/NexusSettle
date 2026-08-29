import { NextResponse } from "next/server";
import { listCharacters } from "@/lib/character-store";
import { defaultCharacter, planFeature } from "@/lib/planner";
import { listProjects, saveProject } from "@/lib/store";
import type { ContentMode } from "@/lib/types";

export async function GET() {
  const projects = listProjects().map((p) => ({
    id: p.id,
    title: p.plan.title,
    status: p.status,
    durationMin: p.durationMin,
    createdAt: p.createdAt,
    shotCount: p.plan.shots.length,
  }));
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    prompt?: string;
    durationMin?: number;
    contentMode?: ContentMode;
    characterId?: string;
  };
  const prompt = (body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "需要提示词" }, { status: 400 });

  const durationMin = [8, 20, 90, 120].includes(Number(body.durationMin))
    ? Number(body.durationMin)
    : 90;
  const contentMode: ContentMode = body.contentMode === "cinematic" ? "cinematic" : "intimate";
  const character =
    listCharacters().find((c) => c.id === body.characterId) || defaultCharacter();
  const plan = planFeature({ prompt, durationMin, contentMode, character });
  const project = saveProject({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    prompt,
    contentMode,
    durationMin,
    status: "draft",
    character,
    plan,
    qc: { face: 0, hands: 0, contact: 0, wardrobe: 0 },
    assemble: {
      lut: "Lumen Print 24",
      fps: 24,
      resolution: "1080p",
      audio: "dialogue+foley+score",
    },
  });
  return NextResponse.json({ id: project.id });
}
