export interface Client {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  priority: 1 | 2 | 3;
  last_contact_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  email_count: number;
  unread_count: number;
}

export interface CreateClientPayload {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  industry?: string;
  priority?: 1 | 2 | 3;
  notes?: string;
}

export interface UpdateClientPayload {
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  priority?: 1 | 2 | 3;
  notes?: string | null;
}
