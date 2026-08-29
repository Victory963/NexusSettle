"use client";

import { ENGINES, GRADE_LABEL, JOIN_LABEL } from "@/lib/engines";
import { posterStyle } from "@/lib/poster";
import type { Shot } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

export function FilmPlayer({ shots, title }: { shots: Shot[]; title: string }) {
  const playable = useMemo(
    () => (shots.some((s) => s.status === "passed") ? shots.filter((s) => s.status === "passed") : shots.slice(0, 24)),
    [shots],
  );
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(8);

  useEffect(() => {
    if (!playing || playable.length === 0) return;
    const shot = playable[i % playable.length];
    const ms = Math.max(120, (shot.durationSec * 1000) / speed);
    const t = setTimeout(() => setI((n) => (n + 1) % playable.length), ms);
    return () => clearTimeout(t);
  }, [playing, i, playable, speed]);

  const shot = playable[i % Math.max(1, playable.length)];
  if (!shot) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
      <div className="relative aspect-video" style={posterStyle(shot.seed)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_28%,rgba(255,255,255,0.2),transparent_40%)]" />
        <div className="absolute left-5 top-5 text-xs tracking-[0.25em] text-white/70">LUMEN · 24fps</div>
        <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-6">
          <div className="font-[family-name:var(--font-display)] text-3xl">{title}</div>
          <p className="mt-2 text-sm text-white/70">
            {shot.sceneTitle} · {shot.beat} · {GRADE_LABEL[shot.grade]} · {ENGINES[shot.engine].name} ·{" "}
            {JOIN_LABEL[shot.join]} · {shot.durationSec}s
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded-full bg-white px-4 py-1.5 text-black"
        >
          {playing ? "暂停" : "播放"}
        </button>
        <button type="button" onClick={() => setSpeed(speed === 8 ? 1 : 8)} className="rounded-full bg-white/10 px-3 py-1.5">
          {speed}× 预览
        </button>
        <div className="ml-auto text-xs text-white/45">
          {i + 1} / {playable.length} 镜 · 未过审镜头不进成片时间线
        </div>
      </div>
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-amber-200"
          style={{ width: `${((i + 1) / Math.max(1, playable.length)) * 100}%` }}
        />
      </div>
    </div>
  );
}
