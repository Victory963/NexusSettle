"use client";

import type { Character } from "@/lib/types";
import { useEffect, useState } from "react";

const CHECKS = [
  { key: "face" as const, title: "脸部特写 8–12 张", d: "正、3/4、侧、微俯、微笑 / 张嘴 / 闭眼", target: 10 },
  { key: "half" as const, title: "半身 8–10 张", d: "两种服装层次、两种光线", target: 9 },
  { key: "full" as const, title: "全身 6–8 张", d: "站、跪、卧，同一体型比例", target: 7 },
];

export default function CharactersPage() {
  const [rows, setRows] = useState<Character[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/characters", { cache: "no-store" });
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setMsg("");
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        trigger,
        lockNotes: "虚构成年角色。参考图锁本镜，身份适配器锁跨镜。不要用真名或真实人脸。",
        bible: { face: 0, half: 0, full: 0 },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "保存失败");
      return;
    }
    setName("");
    setTrigger("");
    load();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Character bible</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">角色圣经</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
        长片崩掉，多半是身份锚太弱。配方：参考图锁这一镜 + 身份适配器锁跨镜。身份适配器与动作适配器必须拆开。只用虚构成年角色，不要提示真实人脸。
      </p>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/4 p-6">
        <h2 className="text-lg">新建虚构角色</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="角色名"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm outline-none"
          />
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="独一无二假词，如 zxq_ai"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm outline-none"
          />
          <button type="button" onClick={create} className="rounded-full bg-white px-4 py-2 text-sm text-black">
            写入圣经
          </button>
        </div>
        {msg ? <p className="mt-3 text-sm text-rose-300">{msg}</p> : null}
      </div>

      <div className="mt-8 grid gap-4">
        {rows.map((c) => (
          <article key={c.id} className="rounded-3xl border border-white/10 bg-white/4 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-3xl">{c.name}</h2>
              <span className="text-xs text-white/40">触发词 {c.trigger}</span>
            </div>
            <p className="mt-2 text-sm text-white/50">{c.lockNotes}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {CHECKS.map((item) => (
                <div key={item.key} className="rounded-2xl bg-black/30 p-4">
                  <div className="text-sm">{item.title}</div>
                  <p className="mt-1 text-xs text-white/40">{item.d}</p>
                  <p className="mt-3 text-xs text-amber-200/80">
                    已锁定 {c.bible[item.key]} / 建议 {item.target}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-amber-200/20 bg-amber-200/5 p-6 text-sm leading-7 text-white/65">
        生产组合：图生视频第一帧用圣经图 + 身份适配器 0.6–0.85 + 提示里重复触发词。动作适配器 0.4–0.8；太高会改第一帧身体。禁止滤镜、过度美颜、不同年龄感、不同鼻唇比例。
      </div>
    </main>
  );
}
