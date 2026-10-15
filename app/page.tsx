import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">NexusSettle</p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-tight md:text-6xl">
        Agent 对 Agent 稳定币清算
      </h1>
      <p className="mt-6 text-base leading-7 text-white/60">
        Agent 只能选择资源 URL。应付义务记入复式账本，窗口内做多边净额，只结算差额。默认资产是 USDC。Visa 与
        Mastercard 只给出不可执行的报价，不含卡号。
      </p>
      <div className="mt-10 flex gap-3 text-sm">
        <Link href="/clearing" className="rounded-full bg-amber-200 px-5 py-2.5 text-black">
          打开清算台
        </Link>
        <Link href="/docs/a2a" className="rounded-full border border-white/15 px-5 py-2.5 text-white/80">
          技术卷宗
        </Link>
      </div>
    </main>
  );
}
