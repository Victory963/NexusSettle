export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Factory</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">工场参数</h1>
      <p className="mt-4 text-sm text-white/50">
        画面只暴露产品能力：Identity / Cinema / Continuity / Drive。推理后端用环境变量对接，不在界面出现供应商型号。
      </p>
      <div className="mt-10 grid gap-4">
        {[
          ["Identity", "IDENTITY_API_URL · workflows/identity_i2v.json · 锁脸与中近景"],
          ["Cinema", "CINEMA_API_URL · workflows/cinema_i2v.json · 运镜与结构"],
          ["Continuity", "CONTINUITY_API_URL · workflows/continuity_flf.json · 首尾帧与刷选"],
          ["Drive", "DRIVE_API_URL · workflows/drive_motion.json · 参考运动驱动外观"],
          ["本地队列", "未配置端点时，片场用加速队列演示分镜、选片与拼装。"],
          ["产能", "一张 24GB 卡约 40–80 条候选、8–15 条过审 / 天。90 分钟请并行多卡。"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/4 px-5 py-4">
            <div className="text-sm">{t}</div>
            <p className="mt-1 text-xs text-white/40">{d}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
