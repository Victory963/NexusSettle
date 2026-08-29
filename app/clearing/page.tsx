import { ClearingDesk } from "@/components/ClearingDesk";
import Link from "next/link";

export default function ClearingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Agent clearing</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">A2A 稳定币清算台</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
        买方 Agent 与卖方 Agent 用 USDC / USDT 完成 HTTP 402 微支付、批量授权后结算、以及按结果托管。
        LLM 不接触收款地址与金额；策略沙箱校验白名单、单笔上限、任务预算与幂等。研究与开源清单见{" "}
        <Link className="text-amber-200" href="/docs/a2a">
          技术卷宗
        </Link>
        。
      </p>
      <div className="mt-10">
        <ClearingDesk />
      </div>
    </main>
  );
}
