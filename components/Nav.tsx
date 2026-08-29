"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "探索" },
  { href: "/studio", label: "创作" },
  { href: "/library", label: "片库" },
  { href: "/characters", label: "角色" },
  { href: "/adapters", label: "适配器" },
  { href: "/clearing", label: "清算" },
  { href: "/settings", label: "工场" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07070a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-amber-200 to-rose-400 text-[11px] font-semibold text-black">
            L
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg tracking-wide">Lumen Studio</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm text-white/60">
          {links.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 transition ${on ? "bg-white/10 text-white" : "hover:text-white"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
