import { posterStyle } from "@/lib/poster";

export function ShotPoster({
  seed,
  label,
  sub,
  playing,
}: {
  seed: number;
  label: string;
  sub?: string;
  playing?: boolean;
}) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl" style={posterStyle(seed)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_42%)]" />
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-4">
        <div className="text-sm text-white">{label}</div>
        {sub ? <div className="mt-1 text-[11px] text-white/60">{sub}</div> : null}
      </div>
      {playing ? (
        <span className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-amber-200" />
      ) : null}
    </div>
  );
}
