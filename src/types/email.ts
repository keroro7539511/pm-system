export type EmailStatus = "unread" | "read" | "replied" | "pending" | "converted";
export type EmailCategory = "requirement" | "issue" | "report" | "other";

export interface Email {
  id: number;
  gmail_id: string | null;
  subject: string | null;
  sender: string | null;
  body: string | null;
  ai_summary: string | null;
  category: EmailCategory | null;
  status: EmailStatus;
  client_id: number | null;
  received_at: string | null;
  created_at: string;
}

export interface EmailAttachment {
  id: number;
  email_id: number;
  filename: string;
  file_path: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
}

export interface UpdateEmailPayload {
  status?: EmailStatus;
  ai_summary?: string;
  category?: EmailCategory;
  client_id?: number;
}
