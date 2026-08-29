import { PromptComposer } from "@/components/PromptComposer";
import { SHOWCASE } from "@/lib/showcase";

export default function StudioPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Studio</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">创作台</h1>
      <p className="mt-4 max-w-2xl text-white/55">
        提示词进入后：分镜 → 按镜头分级派发 Identity / Cinema / Continuity → 选片三关 → 超分与 LUT →
        硬切拼装。90 分钟是工程拼装，不是单次推理。
      </p>
      <div className="mt-10">
        <PromptComposer compact />
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {SHOWCASE.slice(0, 3).map((item) => (
          <div key={item.id} className="overflow-hidden rounded-3xl border border-white/10">
            <div
              className="aspect-video"
              style={{
                background: `linear-gradient(145deg, hsl(${item.hue} 30% 14%), hsl(${item.hue + 50} 38% 20%))`,
              }}
            />
            <div className="p-4 text-sm text-white/60">
              {item.title} · {item.duration}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
