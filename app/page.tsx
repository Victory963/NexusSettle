import { PromptComposer } from "@/components/PromptComposer";
import { SHOWCASE } from "@/lib/showcase";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-16 pt-16 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Online cinematic generation</p>
        <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight md:text-7xl">
          输入提示词，生成可上映的长片
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-white/55">
          每个镜头做成 5–15 秒可过审的 CG 短片，用角色锁身份，用分镜语法与首尾帧把短片拼成 90
          分钟以上。自动选片、调色、声画——不是幻想「一个模型一次吐出整部电影」。
        </p>
        <div className="mt-10 w-full">
          <PromptComposer />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">探索</h2>
          <Link href="/studio" className="text-sm text-amber-200">
            去创作台
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE.map((item) => (
            <article key={item.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/4">
              <div
                className="aspect-video"
                style={{
                  background: `linear-gradient(145deg, hsl(${item.hue} 30% 14%), hsl(${item.hue + 40} 40% 22%))`,
                }}
              />
              <div className="p-4">
                <div className="text-xs text-white/40">
                  {item.tag} · {item.duration}
                </div>
                <h3 className="mt-1 text-lg">{item.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-6 pb-20 md:grid-cols-3">
        {[
          {
            k: "Identity",
            t: "这是谁",
            d: "参考图锁这一镜，身份适配器锁跨镜。人设与动作拆开训，避免锁死同一张床同一种光。",
          },
          {
            k: "Cinema",
            t: "好不好看",
            d: "运镜与结构优先。超过舒适时长就换机位，用电影硬切而不是无限续写。",
          },
          {
            k: "Continuity",
            t: "尺度与首尾",
            d: "同一分镜刷候选、首尾帧插值、有限延长。复杂交互用镜头语法躲开。",
          },
        ].map((c) => (
          <article key={c.k} className="rounded-3xl border border-white/10 bg-white/4 p-6 text-left">
            <div className="text-xs tracking-[0.2em] text-amber-200/80">{c.k}</div>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">{c.t}</h2>
            <p className="mt-3 text-sm leading-7 text-white/55">{c.d}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
