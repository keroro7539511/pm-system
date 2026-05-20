export interface Meeting {
  id: number;
  title: string;
  meeting_date: string | null;
  attendees: string | null;
  transcript: string | null;
  ai_summary: string | null;
  created_at: string;
}

export interface CreateMeetingPayload {
  title: string;
  meeting_date: string | null;
}

export interface UpdateMeetingPayload {
  title?: string | null;
  meeting_date?: string | null;
  transcript?: string | null;
  ai_summary?: string | null;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  description: string;
  assignee: string | null;
  due_date: string | null;
  task_id: number | null;
  created_at: string;
}

export interface ActionItemInput {
  description: string;
  assignee: string | null;
  due_date: string | null;
}

export interface TranscriptSummary {
  summary: string;
  action_items: ActionItemInput[];
}
