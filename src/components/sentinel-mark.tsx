import { ShieldCheck } from "lucide-react";

export function SentinelMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <div className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl"><ShieldCheck className="size-4" /></div>
    {!compact && <div><p className="font-display text-lg font-bold leading-none">Sentinel</p><p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-faint">AI Concierge</p></div>}
  </div>;
}
