export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}
