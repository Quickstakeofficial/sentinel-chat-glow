import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SentinelMark } from "@/components/sentinel-mark";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ensureAccountAccess } from "@/lib/account.functions";

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false); const [confirmationSent, setConfirmationSent] = useState(false);

  async function enterApp() {
    const access = await ensureAccountAccess();
    if (access.isAdmin) await navigate({ to: "/chat/$threadId", params: { threadId: "new" } });
    else await navigate({ to: "/pending" });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; await enterApp();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
        if (error) throw error; if (!data.session) { setConfirmationSent(true); return; } await enterApp();
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't complete that request."); }
    finally { setBusy(false); }
  }
  async function signInWithGoogle() {
    setBusy(true);
    try { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) throw result.error; if (!result.redirected) await enterApp(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Google sign-in failed."); setBusy(false); }
  }

  return <main className="kinetic-shell min-h-dvh overflow-hidden px-4 py-6 sm:px-6">
    <div className="kinetic-panels" aria-hidden="true"><i /><i /><i /></div>
    <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col">
      <header className="flex items-center justify-between"><SentinelMark /><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="status-dot" /> Private access</span></header>
      <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-xl"><p className="eyebrow">Intelligence, standing watch</p><h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] sm:text-7xl">Your clearest thinking, amplified.</h1><p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">A private AI workspace for decisive conversations, thoughtful analysis, and work that stays with you.</p><div className="mt-8 hidden gap-5 text-sm text-soft sm:flex"><span className="flex items-center gap-2"><Check className="size-4 text-accent" /> Saved across devices</span><span className="flex items-center gap-2"><Check className="size-4 text-accent" /> Approval protected</span></div></div>
        <div className="glass-panel mx-auto w-full max-w-md p-5 sm:p-7">
          {confirmationSent ? <div className="py-10 text-center"><div className="brand-mark mx-auto grid size-12 place-items-center rounded-xl"><Check className="size-5" /></div><h2 className="mt-5 font-display text-2xl font-semibold">Check your inbox</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Confirm your email address, then return to Sentinel to continue.</p><Button variant="outline" className="mt-7 w-full" onClick={() => { setConfirmationSent(false); setMode("signin"); }}>Back to sign in</Button></div> : <>
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-subtle p-1"><Button type="button" variant={mode === "signin" ? "glassActive" : "ghost"} onClick={() => setMode("signin")}>Sign in</Button><Button type="button" variant={mode === "signup" ? "glassActive" : "ghost"} onClick={() => setMode("signup")}>Create account</Button></div>
            <div className="mb-6"><h2 className="font-display text-2xl font-semibold">{mode === "signin" ? "Welcome back" : "Request access"}</h2><p className="mt-2 text-sm text-muted-foreground">{mode === "signin" ? "Enter your private Sentinel workspace." : "New accounts are reviewed before chat access."}</p></div>
            <form className="space-y-4" onSubmit={submit}>
              {mode === "signup" && <Input aria-label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="auth-input" />}
              <Input aria-label="Email address" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="auth-input" />
              <div className="relative"><Input aria-label="Password" required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="auth-input pr-11" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>
              <Button type="submit" variant="sentinel" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Enter Sentinel" : "Create account"}<ArrowRight /></Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-faint"><span className="h-px flex-1 bg-border" />or continue with<span className="h-px flex-1 bg-border" /></div>
            <Button type="button" variant="outline" size="lg" className="w-full" disabled={busy} onClick={signInWithGoogle}><span className="font-semibold text-accent">G</span> Google</Button>
          </>}
        </div>
      </section>
    </div>
  </main>;
}
