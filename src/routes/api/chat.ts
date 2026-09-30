import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id.server";

const requestSchema = z.object({ threadId: z.string().uuid(), messages: z.array(z.custom<UIMessage>()) });
const safeError = (status: number, message: string) => Response.json({ error: message }, { status });

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: async ({ request }) => {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return safeError(401, "Please sign in again.");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    if (!url || !key || !lovableApiKey) return safeError(500, "Sentinel is not configured yet.");

    const supabase = createClient<Database>(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await supabase.auth.getUser(authorization.slice(7));
    if (userError || !userData.user) return safeError(401, "Your session has expired. Please sign in again.");
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return safeError(400, "That message could not be sent.");

    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!role) return safeError(403, "Your account is still awaiting approval.");
    const { data: thread } = await supabase.from("threads").select("id,title").eq("id", parsed.data.threadId).eq("user_id", userData.user.id).maybeSingle();
    if (!thread) return safeError(404, "This conversation is no longer available.");

    const latestUser = [...parsed.data.messages].reverse().find((message) => message.role === "user");
    const userText = latestUser?.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim() ?? "";
    if (!latestUser || !userText) return safeError(400, "Enter a message before sending.");
    const { error: insertError } = await supabase.from("messages").insert({ thread_id: thread.id, user_id: userData.user.id, role: "user", content: userText, ai_message_id: latestUser.id });
    if (insertError) return safeError(500, "Your message could not be saved.");
    if (thread.title === "New conversation") await supabase.from("threads").update({ title: userText.replace(/\s+/g, " ").slice(0, 44) || "New conversation" }).eq("id", thread.id);

    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
    const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: lovableApiKey, headers: { "Lovable-API-Key": lovableApiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: runIdFetch.fetch });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: "You are Sentinel, a calm, precise, high-end personal AI assistant. Be clear, useful, and concise. Use markdown when it improves readability.",
        messages: await convertToModelMessages(parsed.data.messages),
        abortSignal: request.signal,
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      });
      const response = result.toUIMessageStreamResponse({
        originalMessages: parsed.data.messages,
        sendReasoning: true,
        onFinish: async ({ responseMessage, isAborted }) => {
          if (isAborted) return;
          const content = responseMessage.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim();
          if (!content) return;
          const { error } = await supabase.from("messages").insert({ thread_id: thread.id, user_id: userData.user.id, role: "assistant", content, ai_message_id: responseMessage.id });
          if (error) console.error("Failed to save Sentinel response", error.message);
        },
      });
      return withLovableAiGatewayRunIdHeader(response, runIdFetch);
    } catch (error) {
      console.error(error);
      return safeError(500, "Sentinel could not respond. Please try again.");
    }
  } } },
});
