import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, LogOut, Menu, MessageSquare, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SentinelMark } from "@/components/sentinel-mark";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { ensureAccountAccess } from "@/lib/account.functions";
import type { ThreadSummary } from "@/lib/sentinel.types";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Summarize this", prompt: "Summarize the following clearly in a few bullet points:\n\n" },
  { label: "Brainstorm ideas", prompt: "Brainstorm 10 creative ideas for " },
  { label: "Draft an email", prompt: "Draft a concise, professional email about " },
  { label: "Explain simply", prompt: "Explain this like I'm new to the topic: " },
  { label: "Plan my day", prompt: "Help me plan a focused, realistic day. My priorities are: " },
];

export function ChatScreen({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadThreads() {
    const { data } = await supabase.from("threads").select("id,title,updated_at").order("updated_at", { ascending: false });
    setThreads(data ?? []);
  }

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { await navigate({ to: "/" }); return; }
      const access = await ensureAccountAccess();
      if (!access.isAdmin) { await navigate({ to: "/pending" }); return; }
      setEmail(access.email); setReady(true); void loadThreads();
    })().catch(() => toast.error("We couldn't verify your access."));
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    setInitial(null);
    void (async () => {
      if (threadId === "new") {
        const { data: user } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("threads").insert({ user_id: user.user!.id, title: "New conversation" }).select("id").single();
        if (error || !data) { toast.error("Couldn't start a conversation."); return; }
        await navigate({ to: "/chat/$threadId", params: { threadId: data.id }, replace: true });
        return;
      }
      const { data } = await supabase.from("messages").select("id,role,content,ai_message_id").eq("thread_id", threadId).order("created_at");
      setInitial((data ?? []).filter((m) => m.role !== "system").map((m) => ({ id: m.ai_message_id ?? m.id, role: m.role as "user" | "assistant", parts: [{ type: "text", text: m.content }] })));
    })();
  }, [ready, threadId, navigate]);

  async function deleteThread(id: string) {
    await supabase.from("threads").delete().eq("id", id);
    if (id === threadId) await navigate({ to: "/chat/$threadId", params: { threadId: "new" } });
    void loadThreads();
  }

  return <div className="kinetic-shell flex h-dvh overflow-hidden">
    <div className="kinetic-panels opacity-40" aria-hidden="true"><i /><i /><i /></div>
    {sidebarOpen && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar/95 p-3 backdrop-blur-xl transition-transform md:static md:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex items-center justify-between px-2 py-2"><SentinelMark compact /><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X /></Button></div>
      <Button variant="sentinel" className="mt-3 w-full justify-start" onClick={() => { setSidebarOpen(false); void navigate({ to: "/chat/$threadId", params: { threadId: "new" } }); }}><Plus /> New conversation</Button>
      <p className="mt-6 px-2 text-[10px] uppercase tracking-[0.18em] text-faint">Recent</p>
      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto">
        {threads.map((t) => <div key={t.id} className={cn("group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors", t.id === threadId ? "bg-elevated text-foreground" : "text-soft hover:bg-subtle")}>
          <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => { setSidebarOpen(false); void navigate({ to: "/chat/$threadId", params: { threadId: t.id } }); }}><MessageSquare className="size-4 shrink-0 text-faint" /><span className="truncate">{t.title}</span></button>
          <button aria-label="Delete conversation" className="opacity-0 text-faint hover:text-destructive group-hover:opacity-100" onClick={() => void deleteThread(t.id)}><Trash2 className="size-3.5" /></button>
        </div>)}
      </nav>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-subtle p-2">
        <div className="brand-mark grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold">{email.slice(0, 1).toUpperCase()}</div>
        <p className="min-w-0 flex-1 truncate text-xs text-soft">{email}</p>
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/" }); }}><LogOut /></Button>
      </div>
    </aside>
    <main className="relative z-10 flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:hidden"><Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu /></Button><SentinelMark compact /></header>
      {initial && threadId !== "new" ? <ChatThread key={threadId} threadId={threadId} initial={initial} onActivity={loadThreads} /> : <div className="grid flex-1 place-items-center"><Shimmer>Preparing your workspace…</Shimmer></div>}
    </main>
  </div>;
}

function ChatThread({ threadId, initial, onActivity }: { threadId: string; initial: UIMessage[]; onActivity: () => void }) {
  const [text, setText] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
    body: { threadId },
  }), [threadId]);
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId, messages: initial, transport,
    onError: (error) => { let msg = error.message; try { msg = JSON.parse(msg).error ?? msg; } catch { /* plain text */ } toast.error(msg || "Sentinel could not respond."); },
    onFinish: () => onActivity(),
  });
  const busy = status === "submitted" || status === "streaming";

  function send(value: string) {
    const trimmed = value.trim(); if (!trimmed || busy) return;
    void sendMessage({ text: trimmed }); setText("");
    if (messages.length === 0) setTimeout(onActivity, 1500);
  }

  return <>
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
        {messages.length === 0 ? <ConversationEmptyState className="min-h-[50vh]">
          <div className="brand-mark grid size-14 place-items-center rounded-2xl"><SentinelGlyph /></div>
          <h2 className="mt-5 font-display text-3xl font-semibold sm:text-4xl">What's on your mind?</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Ask anything. Sentinel keeps every conversation saved and private.</p>
        </ConversationEmptyState> : messages.map((m) => <Message key={m.id} from={m.role} className="msg-enter">
          <MessageContent className={m.role === "user" ? "user-bubble max-w-[85%]" : "ai-card w-full max-w-full"}>
            {m.parts.map((part, i) => part.type === "text" ? (m.role === "user" ? <p key={i} className="whitespace-pre-wrap text-[15px] leading-6">{part.text}</p> : <MessageResponse key={i}>{part.text}</MessageResponse>) : null)}
          </MessageContent>
        </Message>)}
        {status === "submitted" && <div className="ai-card msg-enter w-fit"><Shimmer>Sentinel is thinking…</Shimmer></div>}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
    <div className="mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
      <PromptInput className="composer" onSubmit={({ text: value }) => send(value)}>
        <PromptInputBody>
          <PromptInputTextarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Message Sentinel..." className="min-h-12 text-[15px]" />
        </PromptInputBody>
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} className="brand-button size-9 rounded-full">{busy ? undefined : <ArrowUp className="size-4" />}</PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
      <div className="scrollbar-none mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {QUICK_ACTIONS.map((a) => <button key={a.label} type="button" className="chip" onClick={() => setText(a.prompt)}>{a.label}</button>)}
      </div>
    </div>
  </>;
}

function SentinelGlyph() {
  return <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" /><circle cx="12" cy="11" r="2.5" /></svg>;
}
