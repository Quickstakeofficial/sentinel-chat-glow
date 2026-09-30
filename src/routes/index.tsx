import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sentinel — Private AI workspace" },
    { name: "description", content: "Sign in to your secure Sentinel AI workspace." },
    { property: "og:title", content: "Sentinel — Private AI workspace" },
    { property: "og:description", content: "A private, approval-protected AI workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <AuthScreen />,
});
