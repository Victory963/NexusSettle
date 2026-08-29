import { copyFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { Project } from "./types";

const DB = join(process.cwd(), "data", "projects.json");

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

export function listProjects(): Project[] {
  mkdirSync(dirname(DB), { recursive: true });
  try {
    const raw = readFileSync(DB, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

export function getProject(id: string) {
  return listProjects().find((p) => p.id === id);
}

export function saveProject(project: Project) {
  const all = listProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.unshift(project);
  atomicWrite(DB, JSON.stringify(all, null, 2));
  return project;
}

export function applyElapsedProgress(project: Project): Project {
  if (!project.startedAt || project.status === "draft" || project.status === "ready") return project;

  const shots = project.plan.shots;
  const msPerShot = Math.max(35, Math.floor(16000 / Math.max(1, shots.length)));
  const elapsed = Date.now() - project.startedAt;
  const doneCount = Math.min(shots.length, Math.floor(elapsed / msPerShot));

  for (let i = 0; i < shots.length; i++) {
    if (i < doneCount) {
      shots[i].status = "passed";
      shots[i].takes = shots[i].seed % 6 === 0 ? 3 : 1;
    } else if (i === doneCount) {
      shots[i].status = "generating";
    } else if (shots[i].status !== "retry") {
      shots[i].status = "queued";
    }
  }

  if (doneCount >= shots.length) {
    const assembleFor = 2800;
    project.status = elapsed > shots.length * msPerShot + assembleFor ? "ready" : "assembling";
  } else {
    project.status = "generating";
  }

  const passed = shots.filter((s) => s.status === "passed").length;
  const n = Math.max(1, passed);
  project.qc = {
    face: Math.min(99, 70 + (n % 20)),
    hands: Math.min(99, 62 + (n % 18)),
    contact: Math.min(99, 58 + (n % 22)),
    wardrobe: Math.min(99, 74 + (n % 16)),
  };
  return project;
}
