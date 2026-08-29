export default function AdaptersPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Adapters</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">身份 / 动作适配器</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">
        人设和动作是两个插件，不要合成一个万能文件。身份适配器锁跨镜的脸；动作适配器只标注动作、打散身体与发型。
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/4 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">身份适配器</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-white/60">
            <li>数据：圣经图 20–40 张，或 2–8 秒短视频 10–30 条</li>
            <li>训练分辨率 544×960 或 768，推理再 720p</li>
            <li>帧桶必须 4N+1：17 / 33 / 65</li>
            <li>步数：图约 3k–5k；视频看数据防过拟合</li>
            <li>Rank 16–32 起步；触发词用假词</li>
            <li>高噪声与低噪声都要训或都要挂</li>
          </ul>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/4 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">动作适配器</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-white/60">
            <li>20–30 条短视频，至少 4 个不同身体</li>
            <li>发型肤色打散，只标注动作，不锁脸</li>
            <li>2–8 秒覆盖 1–2 个动作周期</li>
            <li>推理：身份 0.7 + 动作 0.4–0.8</li>
            <li>动作权重过高会改第一帧身体</li>
            <li>复杂接触仍用分镜规避，不指望适配器创造物理约束</li>
          </ul>
        </article>
      </div>
      <p className="mt-8 text-sm text-white/40">训练产物放在 loras/identity_* 与 loras/motion_*，与角色目录解耦。</p>
    </main>
  );
}
