import { NextResponse } from "next/server";
import { listCharacters, saveCharacter } from "@/lib/character-store";
import type { Character } from "@/lib/types";

export async function GET() {
  return NextResponse.json(listCharacters());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Character>;
  const name = (body.name || "").trim();
  const trigger = (body.trigger || "").trim();
  if (!name || !trigger) {
    return NextResponse.json({ error: "需要角色名与触发词" }, { status: 400 });
  }
  const character = saveCharacter({
    id: body.id || crypto.randomUUID(),
    name,
    trigger,
    lockNotes: body.lockNotes || "虚构成年角色。身份适配器与动作适配器拆开训。",
    identityWeight: body.identityWeight ?? 0.75,
    motionWeight: body.motionWeight ?? 0.55,
    bible: body.bible || { face: 0, half: 0, full: 0 },
  });
  return NextResponse.json(character);
}
