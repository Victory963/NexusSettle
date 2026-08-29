export type EngineId = "identity" | "cinema" | "continuity" | "drive";

export type ShotGrade = "A" | "B" | "C" | "D" | "E";

export type ContentMode = "cinematic" | "intimate";

export type JoinMethod = "hard-cut" | "tail-extend" | "first-last";

export type JobStatus = "draft" | "planning" | "queued" | "generating" | "qc" | "assembling" | "ready" | "failed";

export type ShotStatus = "queued" | "generating" | "retry" | "passed" | "rejected";

export type Character = {
  id: string;
  name: string;
  trigger: string;
  lockNotes: string;
  identityWeight: number;
  motionWeight: number;
  bible: {
    face: number;
    half: number;
    full: number;
  };
};

export type Shot = {
  id: string;
  index: number;
  act: number;
  sceneId: string;
  sceneTitle: string;
  beat: string;
  grade: ShotGrade;
  engine: EngineId;
  join: JoinMethod;
  durationSec: number;
  prompt: string;
  camera: string;
  status: ShotStatus;
  takes: number;
  seed: number;
  startFrameHash?: string;
};

export type Scene = {
  id: string;
  act: number;
  title: string;
  intent: string;
  durationSec: number;
  musicBed: string;
};

export type FeaturePlan = {
  title: string;
  logline: string;
  durationMin: number;
  approvedShotTarget: number;
  candidateEstimate: number;
  mix: Record<ShotGrade, number>;
  scenes: Scene[];
  shots: Shot[];
};

export type Project = {
  id: string;
  createdAt: number;
  startedAt?: number;
  prompt: string;
  contentMode: ContentMode;
  durationMin: number;
  status: JobStatus;
  character: Character;
  plan: FeaturePlan;
  qc: {
    face: number;
    hands: number;
    contact: number;
    wardrobe: number;
  };
  assemble: {
    lut: string;
    fps: number;
    resolution: string;
    audio: "dialogue+foley+score";
  };
};
