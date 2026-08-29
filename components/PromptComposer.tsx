"use client";

import type { Character } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DURATIONS = [
  { min: 8, label: "8 分钟样片" },
  { min: 20, label: "20 分钟成片" },
  { min: 90, label: "90 分钟长片" },
  { min: 120, label: "120 分钟" },
];

export function PromptComposer({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    "雨夜公寓，一位虚构的成年女性独自回家。电影感灯光，身份全程锁定。亲密戏用剪辑暗示，不写复杂全身接触长镜头。",
  );
  const [durationMin, setDurationMin] = useState(90);
  const [contentMode, setContentMode] = useState<"intimate" | "cinematic">("intimate");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState("char-lina");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/characters", { cache: "no-store" })
      .then((r) => r.json())
      .then((rows: Character[]) => {
        setCharacters(rows);
        if (rows[0]) setCharacterId(rows[0].id);
      })
      .catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, durationMin, contentMode, characterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      router.push(`/project/${data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`mx-auto w-full ${compact ? "" : "max-w-3xl"}`}>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-2 shadow-[0_0_80px_rgba(251,191,36,0.08)]">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={compact ? 4 : 5}
          className="w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-7 text-white outline-none placeholder:text-white/35"
          placeholder="描述角色、空间、情绪与节奏。系统会自动分镜、选镜、硬切拼装成长片。"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-3 py-3">
          {DURATIONS.map((d) => (
            <button
              key={d.min}
              type="button"
              onClick={() => setDurationMin(d.min)}
              className={`rounded-full px-3 py-1 text-xs ${
                durationMin === d.min ? "bg-amber-200 text-black" : "bg-white/8 text-white/70"
              }`}
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setContentMode(contentMode === "intimate" ? "cinematic" : "intimate")}
            className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70"
          >
            {contentMode === "intimate" ? "亲密戏语法" : "剧情电影语法"}
          </button>
          {characters.length > 0 ? (
            <select
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/80 outline-none"
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#111]">
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}
          <div className="ml-auto">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {busy ? "正在分镜…" : "生成长片"}
            </button>
          </div>
        </div>
      </div>
      {err ? <p className="mt-3 text-center text-sm text-rose-300">{err}</p> : null}
    </div>
  );
}
