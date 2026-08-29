import { listProjects } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  const rows = listProjects().map((p) => ({
    id: p.id,
    title: p.plan.title,
    status: p.status,
    durationMin: p.durationMin,
    createdAt: p.createdAt,
    shotCount: p.plan.shots.length,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Library</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">片库</h1>
      <p className="mt-3 text-white/50">所有长片计划、生成队列与可导出成片。</p>
      <div className="mt-10 grid gap-4">
        {rows.length === 0 ? (
          <p className="text-white/40">还没有项目。去创作台输入提示词。</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              href={`/project/${r.id}`}
              className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/4 px-6 py-5 hover:bg-white/8"
            >
              <div>
                <div className="text-lg">{r.title}</div>
                <div className="mt-1 text-xs text-white/40">
                  {r.durationMin} 分钟 · {r.shotCount} 镜 · {r.status}
                </div>
              </div>
              <span className="text-sm text-amber-200">打开片场</span>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
