import Link from "next/link";
import { SOURCES } from "@/lib/clearing/sources";

export default function A2ADocsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Research</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl">Agent 支付栈卷宗</h1>
      <p className="mt-4 text-sm leading-7 text-white/55">
        完整架构、协议对照与开源链接。工程入口：
        <Link className="ml-1 text-amber-200" href="/clearing">
          清算台
        </Link>
        。三套新手入口共用同一清算核心：Codex 读 <code>AGENTS.md</code> 与
        <code>docs/BEGINNER_SETUP.md</code>；Claude Code 读 <code>CLAUDE.md</code> 与
        <code>docs/CLAUDE_CODE_GUIDE.md</code>；Cursor 读 <code>.cursor/rules/</code> 与
        <code>docs/CURSOR_GUIDE.md</code>。
      </p>
      {SOURCES.map((section) => (
        <section key={section.title} className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">{section.title}</h2>
          {section.blurb && <p className="mt-3 text-sm leading-7 text-white/50">{section.blurb}</p>}
          <ul className="mt-4 space-y-3 text-sm">
            {section.links.map((l) => (
              <li key={l.href} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                <a className="text-amber-100 hover:underline" href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
                <p className="mt-1 text-white/45">{l.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
