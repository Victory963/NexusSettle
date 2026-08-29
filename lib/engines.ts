import type { EngineId, JoinMethod, ShotGrade, ShotStatus } from "./types";

/** Product-facing names only. Never surface vendor model strings in the UI. */
export const ENGINES: Record<
  EngineId,
  { name: string; role: string; comfort: string }
> = {
  identity: {
    name: "Identity",
    role: "锁身份：中近景、单人动作、图生视频第一帧",
    comfort: "720p / 24fps 舒适区",
  },
  cinema: {
    name: "Cinema",
    role: "锁镜头：运镜、结构、指令跟随",
    comfort: "消费级更轻；长于 10 秒后需换机位",
  },
  continuity: {
    name: "Continuity",
    role: "锁尺度与首尾帧：短镜头刷选、延长、多帧插值",
    comfort: "适合同一分镜多候选",
  },
  drive: {
    name: "Drive",
    role: "动作驱动：参考运动进生成，外观交给角色锁",
    comfort: "用参考动作代替纯文生体位",
  },
};

export function pickEngine(grade: ShotGrade, join: "hard-cut" | "tail-extend" | "first-last"): EngineId {
  if (join === "first-last") return "continuity";
  if (join === "tail-extend") return "continuity";
  switch (grade) {
    case "A":
    case "E":
      return "identity";
    case "B":
      return "cinema";
    case "C":
    case "D":
      return "continuity";
    default:
      return "identity";
  }
}

export const GRADE_LABEL: Record<ShotGrade, string> = {
  A: "近景表情",
  B: "单人全身",
  C: "同框轻接触",
  D: "复杂交互（剪辑暗示）",
  E: "情绪 / 局部特写",
};

export const JOIN_LABEL: Record<JoinMethod, string> = {
  "hard-cut": "硬切",
  "tail-extend": "尾帧续写",
  "first-last": "首尾帧",
};

export const STATUS_LABEL: Record<ShotStatus, string> = {
  queued: "排队",
  generating: "生成",
  retry: "重 roll",
  passed: "过审",
  rejected: "未过",
};
