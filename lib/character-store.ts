import { copyFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { defaultCharacter } from "./planner";
import type { Character } from "./types";

const DB = join(process.cwd(), "data", "characters.json");

function atomicWrite(path: string, data: string) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, data, "utf8");
  copyFileSync(tmp, path);
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
}

export function listCharacters(): Character[] {
  mkdirSync(dirname(DB), { recursive: true });
  try {
    const raw = readFileSync(DB, "utf8");
    if (!raw.trim()) return [defaultCharacter()];
    const rows = JSON.parse(raw) as Character[];
    return rows.length ? rows : [defaultCharacter()];
  } catch {
    return [defaultCharacter()];
  }
}

export function saveCharacter(character: Character) {
  const all = listCharacters().filter((c) => c.id !== character.id);
  all.unshift(character);
  atomicWrite(DB, JSON.stringify(all, null, 2));
  return character;
}
