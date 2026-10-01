import { createFileRoute } from "@tanstack/react-router";
import { ChatScreen } from "@/components/chat-screen";

export const Route = createFileRoute("/chat/$threadId")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Chat — Sentinel" },
    { name: "description", content: "Your private Sentinel AI conversations." },
    { property: "og:title", content: "Chat — Sentinel" },
    { property: "og:description", content: "Private, approval-protected AI conversations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ChatRoute,
});

function ChatRoute() {
  const { threadId } = Route.useParams();
  return <ChatScreen threadId={threadId} />;
}
