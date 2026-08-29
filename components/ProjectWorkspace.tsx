"use client";

import { FilmPlayer } from "@/components/FilmPlayer";
import { ShotPoster } from "@/components/ShotPoster";
import { ENGINES, GRADE_LABEL, JOIN_LABEL, STATUS_LABEL } from "@/lib/engines";
import { estimateFactoryDays } from "@/lib/planner";
import type { Project, Shot } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export function ProjectWorkspace({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<"play" | "board" | "queue" | "edit">("play");
  const [filter, setFilter] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
    if (res.ok) setProject(await res.json());
  }, [id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    const t = setInterval(() => void refresh(), 900);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [refresh]);

  async function run() {
    await fetch(`/api/projects/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run" }),
    });
    void refresh();
  }

  async function retry(shotId: string) {
    await fetch(`/api/projects/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", shotId }),
    });
    void refresh();
  }

  const shots = useMemo(() => project?.plan.shots ?? [], [project]);
  const passed = shots.filter((s) => s.status === "passed").length;
  const seconds = shots.reduce((a, s) => a + s.durationSec, 0);
  const filtered = useMemo(
    () =>
      shots.filter((s) =>
        filter
          ? `${s.sceneTitle}${s.beat}${s.grade}${s.engine}${s.prompt}`.toLowerCase().includes(filter.toLowerCase())
          : true,
      ),
    [shots, filter],
  );

  if (!project) {
    return <div className="px-6 py-20 text-center text-white/50">载入片场…</div>;
  }

  const days = estimateFactoryDays(project.plan.approvedShotTarget, 1);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-200/80">Feature factory</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">{project.plan.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{project.plan.logline}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/projects/${id}/export`}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            下载硬切脚本
          </a>
          {project.status === "draft" || project.status === "ready" ? (
            <button onClick={run} className="rounded-full bg-amber-200 px-5 py-2 text-sm font-medium text-black">
              {project.status === "ready" ? "重新开工" : "启动生成工场"}
            </button>
          ) : (
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
              {jobLabel(project.status)}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="目标片长" value={`${project.durationMin} 分钟`} />
        <Stat label="过审镜头" value={`${passed} / ${shots.length}`} />
        <Stat label="有效画面" value={`${Math.round(seconds / 60)} 分 ${seconds % 60} 秒`} />
        <Stat label="单卡估时" value={`约 ${days} 天`} />
      </div>

      <p className="mt-4 text-xs leading-5 text-white/40">
        产能公式：{project.durationMin} 分钟约 {project.plan.approvedShotTarget} 条过审镜头，按 20% 过审率约需{" "}
        {project.plan.candidateEstimate} 次生成。单镜 5–15 秒；长片靠分镜 + 硬切 + 有限续写拼出来。
      </p>

      <div className="mt-8 flex gap-2 text-sm">
        {(
          [
            ["play", "成片预览"],
            ["board", "分镜"],
            ["queue", "生成队列"],
            ["edit", "剪辑台"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 ${tab === k ? "bg-white text-black" : "bg-white/8 text-white/70"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "play" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <FilmPlayer shots={shots} title={project.plan.title} />
          </div>
          <Overview project={project} passed={passed} />
        </div>
      ) : null}

      {tab === "board" ? (
        <div className="mt-6">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="筛选镜头、引擎、场景…"
            className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 60).map((s) => (
              <ShotCard key={s.id} shot={s} onRetry={() => retry(s.id)} />
            ))}
          </div>
          {filtered.length > 60 ? (
            <p className="mt-4 text-center text-xs text-white/35">
              仅展示前 60 条，全部 {filtered.length} 条已进入工场队列。
            </p>
          ) : null}
        </div>
      ) : null}
      {tab === "queue" ? <Queue shots={shots} /> : null}
      {tab === "edit" ? <Editor project={project} /> : null}
    </div>
  );
}

function jobLabel(s: Project["status"]) {
  const map: Record<Project["status"], string> = {
    draft: "草稿",
    planning: "分镜中",
    queued: "排队",
    generating: "生成中",
    qc: "选片",
    assembling: "拼装 / 调色 / 声画",
    ready: "可导出",
    failed: "失败",
  };
  return map[s];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
      <div className="text-xs text-white/40">{label}</div>
      <div className="mt-1 text-lg text-white">{value}</div>
    </div>
  );
}

function Overview({ project, passed }: { project: Project; passed: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/4 p-6">
      <h2 className="text-sm text-white/50">引擎分工（产品名）</h2>
      <div className="mt-4 space-y-3">
        {Object.values(ENGINES).map((e) => (
          <div key={e.name} className="rounded-2xl bg-black/30 p-4">
            <div className="font-[family-name:var(--font-display)] text-xl">{e.name}</div>
            <p className="mt-1 text-sm leading-6 text-white/55">{e.role}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-sm text-white/50">角色锁</h2>
      <p className="mt-3 font-[family-name:var(--font-display)] text-2xl">{project.character.name}</p>
      <p className="mt-2 text-sm text-white/50">触发词 {project.character.trigger}</p>
      <p className="mt-3 text-sm leading-6 text-white/55">{project.character.lockNotes}</p>
      <div className="mt-3 text-xs text-white/40">
        圣经 {project.character.bible.face} 脸 / {project.character.bible.half} 半身 / {project.character.bible.full}{" "}
        全身 · 身份 {project.character.identityWeight} · 动作 {project.character.motionWeight}
      </div>
      <Link href="/characters" className="mt-5 inline-block text-sm text-amber-200">
        打开角色圣经 →
      </Link>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-linear-to-r from-amber-200 to-rose-400"
          style={{ width: `${(passed / Math.max(1, project.plan.shots.length)) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-white/40">选片关卡：脸 · 手 · 接触面 · 服装发型</p>
    </div>
  );
}

function ShotCard({ shot, onRetry }: { shot: Shot; onRetry: () => void }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/4 p-3">
      <ShotPoster
        seed={shot.seed}
        label={shot.beat || GRADE_LABEL[shot.grade]}
        sub={`${shot.id} · ${STATUS_LABEL[shot.status]}`}
        playing={shot.status === "generating"}
      />
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-white/10 px-2 py-0.5">{GRADE_LABEL[shot.grade]}</span>
        <span className="rounded-full bg-amber-200/15 px-2 py-0.5 text-amber-100">{ENGINES[shot.engine].name}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">{JOIN_LABEL[shot.join]}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">{shot.durationSec}s</span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">{shot.prompt}</p>
      <button type="button" onClick={onRetry} className="mt-2 text-xs text-amber-200">
        未过审则重 roll
      </button>
    </article>
  );
}

function Queue({ shots }: { shots: Shot[] }) {
  const counts = shots.reduce<Record<string, number>>((a, s) => {
    a[s.status] = (a[s.status] || 0) + 1;
    return a;
  }, {});
  return (
    <div className="mt-6">
      <div className="mb-4 flex gap-3 text-xs text-white/50">
        {Object.entries(counts).map(([k, n]) => (
          <span key={k}>
            {STATUS_LABEL[k as Shot["status"]] || k} {n}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs text-white/40">
            <tr>
              <th className="px-4 py-3">镜</th>
              <th>节拍</th>
              <th>引擎</th>
              <th>接法</th>
              <th>时长</th>
              <th>takes</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {shots.slice(0, 100).map((s) => (
              <tr key={s.id} className="border-t border-white/8">
                <td className="px-4 py-2 text-white/80">{s.id}</td>
                <td className="text-white/60">{s.beat}</td>
                <td>{ENGINES[s.engine].name}</td>
                <td className="text-white/50">{JOIN_LABEL[s.join]}</td>
                <td>{s.durationSec}s</td>
                <td>{s.takes}</td>
                <td>{STATUS_LABEL[s.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Editor({ project }: { project: Project }) {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/4 p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl">自动剪辑台</h2>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-white/60">
        <li>硬切为默认。身份靠角色圣经 + 身份适配器，不靠时间连续。</li>
        <li>同一镜头最多续写 3–4 段（约 20–30 秒），然后换机位重新打锚。</li>
        <li>口型只贴正脸说话近景。动作声走拟音峰值对齐，音乐每场一条床、切镜 2 拍重叠。</li>
        <li>
          输出 {project.assemble.resolution} {project.assemble.fps}fps · LUT {project.assemble.lut} ·{" "}
          {project.assemble.audio}
        </li>
        <li>后期流水：选片 → 超分 → 慢动作才插帧 → 统一 LUT → 拼接声画。不合格直接重 roll。</li>
      </ul>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {project.plan.scenes.map((sc) => (
          <div key={sc.id} className="min-w-40 rounded-2xl bg-black/40 p-3">
            <div className="text-xs text-white/40">第 {sc.act} 幕</div>
            <div className="mt-1 text-sm">{sc.title}</div>
            <div className="mt-2 h-10 rounded bg-linear-to-r from-white/10 to-amber-200/20" />
            <div className="mt-2 text-[11px] text-white/35">
              {sc.durationSec}s · {sc.musicBed}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
