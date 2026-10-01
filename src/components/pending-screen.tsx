import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SentinelMark } from "@/components/sentinel-mark";
import { supabase } from "@/integrations/supabase/client";
import { ensureAccountAccess } from "@/lib/account.functions";
import type { AccessState } from "@/lib/sentinel.types";

export function PendingScreen() {
  const navigate = useNavigate();
  const [access, setAccess] = useState<AccessState | null>(null);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { await navigate({ to: "/" }); return; }
      const next = await ensureAccountAccess();
      if (next.isAdmin) { await navigate({ to: "/chat/$threadId", params: { threadId: "new" } }); return; }
      setAccess(next);
    })();
  }, [navigate]);

  return <main className="kinetic-shell grid min-h-dvh place-items-center overflow-hidden px-4 py-8">
    <div className="kinetic-panels" aria-hidden="true"><i /><i /><i /></div>
    <div className="relative z-10 w-full max-w-xl">
      <div className="mb-7 flex justify-center"><SentinelMark /></div>
      <section className="glass-panel overflow-hidden text-center">
        <div className="pending-stripe h-2" />
        <div className="p-7 sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-warning/30 bg-warning/10 text-warning"><Clock3 className="size-7" /></div>
          <p className="eyebrow mt-7 text-warning!">Access review in progress</p>
          <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">You’re on the list.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">Your Sentinel workspace is reserved while an administrator reviews your account. We’ll keep everything ready.</p>
          <div className="mx-auto mt-7 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-subtle px-4 py-3 text-left">
            <Mail className="size-4 shrink-0 text-accent" /><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.16em] text-faint">Signed in as</p><p className="truncate text-sm text-soft">{access?.email ?? "Checking account…"}</p></div>
          </div>
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-faint"><ShieldCheck className="size-4" /> Approval is required before conversations can begin.</div>
          <Button variant="outline" className="mt-8" onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/" }); }}><LogOut /> Sign out</Button>
        </div>
      </section>
    </div>
  </main>;
}
