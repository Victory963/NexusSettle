import { pickEngine } from "./engines";
import type {
  Character,
  ContentMode,
  FeaturePlan,
  JoinMethod,
  Scene,
  Shot,
  ShotGrade,
} from "./types";

const MIX_INTIMATE: Record<ShotGrade, number> = {
  A: 0.35,
  B: 0.3,
  C: 0.15,
  D: 0.1,
  E: 0.1,
};

const MIX_CINEMA: Record<ShotGrade, number> = {
  A: 0.4,
  B: 0.38,
  C: 0.12,
  D: 0.02,
  E: 0.08,
};

const GRADE_DURATION: Record<ShotGrade, [number, number]> = {
  A: [5, 8],
  B: [5, 10],
  C: [4, 6],
  D: [2, 5],
  E: [3, 6],
};

type Beat = { grade: ShotGrade; join: JoinMethod; beat: string };

const INTIMATE_BEATS: Beat[] = [
  { grade: "A", join: "hard-cut", beat: "进场 / 对视" },
  { grade: "A", join: "hard-cut", beat: "对话近景" },
  { grade: "B", join: "first-last", beat: "起身走近" },
  { grade: "A", join: "hard-cut", beat: "中近景动作" },
  { grade: "C", join: "first-last", beat: "同框轻接触" },
  { grade: "D", join: "hard-cut", beat: "交互暗示局部" },
  { grade: "E", join: "hard-cut", beat: "情绪特写" },
  { grade: "A", join: "hard-cut", beat: "余韵" },
];

const CINEMA_BEATS: Beat[] = [
  { grade: "A", join: "hard-cut", beat: "建立空间" },
  { grade: "A", join: "hard-cut", beat: "对话近景" },
  { grade: "B", join: "first-last", beat: "走位 / 运镜" },
  { grade: "B", join: "hard-cut", beat: "全身动作" },
  { grade: "A", join: "tail-extend", beat: "锁脸续写" },
  { grade: "C", join: "first-last", beat: "同框但少接触" },
  { grade: "E", join: "hard-cut", beat: "反应特写" },
  { grade: "A", join: "hard-cut", beat: "落幅" },
];

const ACTS = [
  { title: "建立", intent: "空间、身份、视线。只用近景与走位，不写复杂接触。" },
  { title: "靠近", intent: "距离缩短。用首尾帧做走近/起身，不连续硬刚接触面。" },
  { title: "关系", intent: "同框但接触少：背、手、脸。复杂交互切局部与反应。" },
  { title: "峰值", intent: "情绪特写与暗示剪辑，禁止全身+接触同镜硬生成。" },
  { title: "余韵", intent: "结束后的躺、看、呼吸。重新用圣经图打锚。" },
];

function hashSeed(text: string, i: number) {
  let h = 2166136261 ^ i;
  for (let c = 0; c < text.length; c++) {
    h ^= text.charCodeAt(c);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

function titleFromPrompt(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 18) || "未命名长片";
}

function cameraFor(grade: ShotGrade): string {
  switch (grade) {
    case "A":
      return "中近景，锁脸，机位固定或极慢推";
    case "B":
      return "全身，跟拍或侧移，动作周期 1–2 个";
    case "C":
      return "双人同框，接触面尽量出画或被遮挡";
    case "D":
      return "局部 / 反应镜头 / 画外，不一次生成完整过程";
    case "E":
      return "脸或身体局部特写，不同时要全身与接触";
  }
}

function durationFor(grade: ShotGrade, i: number, join: JoinMethod) {
  const [min, max] = GRADE_DURATION[grade];
  let sec = min + (i % (max - min + 1));
  if (join === "tail-extend") sec = Math.min(15, sec + 4);
  return sec;
}

function shotPrompt(
  prompt: string,
  character: Character,
  grade: ShotGrade,
  sceneTitle: string,
  beat: string,
  join: JoinMethod,
) {
  const lock = `触发词 ${character.trigger}。发型与体型按角色圣经，只描述一次且固定。`;
  const cont =
    join === "tail-extend"
      ? "从前一段最后一帧无缝继续；服装、发型、机位不变。尾帧权重略低于圣经参考，避免把漂变锁死。"
      : join === "first-last"
        ? "只负责起点静帧到终点静帧之间的运动。两端光、衣服、比例必须一致。"
        : "硬切新机位，第一帧用圣经参考图重新打锚。";
  const grammar =
    grade === "D"
      ? "接触发生在画外或被肢体遮挡；镜头给脸、背或手。禁止一次生成完整解剖过程。"
      : grade === "C"
        ? "接触幅度低。先定合格静帧再做小幅度运动。"
        : "单人优先，身份稳定高于动作幅度。";
  return `${prompt}。场景：${sceneTitle} · ${beat}。${lock} ${cameraFor(grade)}。${grammar} ${cont}`;
}

function sceneBeats(prompt: string, durationMin: number): Scene[] {
  const sceneCount = Math.max(8, Math.round(durationMin / 2.5));
  const scenes: Scene[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const act = Math.min(5, Math.floor((i / sceneCount) * 5) + 1);
    const meta = ACTS[act - 1];
    scenes.push({
      id: `sc-${String(i + 1).padStart(3, "0")}`,
      act,
      title: `${meta.title} · ${i + 1}`,
      intent: `${meta.intent} 主提示：${prompt.slice(0, 80)}`,
      durationSec: 0,
      musicBed: `bed-${act}`,
    });
  }
  return scenes;
}

function beatsForMode(mode: ContentMode, index: number, mix: Record<ShotGrade, number>): Beat {
  const template = mode === "intimate" ? INTIMATE_BEATS : CINEMA_BEATS;
  const base = template[index % template.length];
  if (mode === "cinematic" && base.grade === "D") {
    return { ...base, grade: "B", beat: "全身走位（规避复杂接触）" };
  }
  if (mix.D < 0.05 && base.grade === "D") {
    return { ...base, grade: "E", beat: "反应特写" };
  }
  return base;
}

export function planFeature(input: {
  prompt: string;
  durationMin: number;
  contentMode: ContentMode;
  character: Character;
}): FeaturePlan {
  const mix = input.contentMode === "intimate" ? MIX_INTIMATE : MIX_CINEMA;
  const approvedShotTarget = Math.max(24, Math.round(input.durationMin * 4));
  const candidateEstimate = Math.round(approvedShotTarget / 0.2);
  const scenes = sceneBeats(input.prompt, input.durationMin);
  const perScene = Math.max(6, Math.ceil(approvedShotTarget / scenes.length));
  const shots: Shot[] = [];
  let index = 0;

  for (const scene of scenes) {
    for (let k = 0; k < perScene && index < approvedShotTarget; k++) {
      const beat = beatsForMode(input.contentMode, k, mix);
      let join = beat.join;
      if (k > 0 && k % 4 === 0 && beat.grade === "A") join = "tail-extend";
      const engine = pickEngine(beat.grade, join);
      const durationSec = durationFor(beat.grade, index, join);
      shots.push({
        id: `sh-${String(index + 1).padStart(4, "0")}`,
        index: index + 1,
        act: scene.act,
        sceneId: scene.id,
        sceneTitle: scene.title,
        beat: beat.beat,
        grade: beat.grade,
        engine,
        join,
        durationSec,
        prompt: shotPrompt(
          input.prompt,
          input.character,
          beat.grade,
          scene.title,
          beat.beat,
          join,
        ),
        camera: cameraFor(beat.grade),
        status: "queued",
        takes: 0,
        seed: hashSeed(input.prompt + input.character.trigger, index),
      });
      index += 1;
    }
  }

  const byScene: Record<string, number> = {};
  for (const s of shots) byScene[s.sceneId] = (byScene[s.sceneId] || 0) + s.durationSec;
  for (const sc of scenes) sc.durationSec = byScene[sc.id] || 0;

  return {
    title: titleFromPrompt(input.prompt),
    logline: input.prompt.trim(),
    durationMin: input.durationMin,
    approvedShotTarget: shots.length,
    candidateEstimate,
    mix,
    scenes,
    shots,
  };
}

export function defaultCharacter(): Character {
  return {
    id: "char-lina",
    name: "Lina Vale",
    trigger: "zxq_ai",
    lockNotes: "虚构成年角色。参考图锁本镜 + 身份适配器锁跨镜。动作适配器必须拆开训练。",
    identityWeight: 0.75,
    motionWeight: 0.55,
    bible: { face: 10, half: 9, full: 7 },
  };
}

export function estimateFactoryDays(approvedShots: number, gpus: number) {
  const passedPerDay = 12 * Math.max(1, gpus);
  return Math.max(1, Math.ceil(approvedShots / passedPerDay));
}
