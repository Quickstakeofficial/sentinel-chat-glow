import type { UIMessage } from "ai";

export type AccessState = {
  email: string;
  displayName: string;
  isAdmin: boolean;
  status: "pending" | "approved";
};

export type ThreadSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export type SentinelMessage = UIMessage;
