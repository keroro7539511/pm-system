export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  company_address: string | null;
  project_id: number | null;
  project_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  project_id?: number | null;
  notes?: string | null;
}

export interface UpdateContactPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  project_id?: number | null;
  notes?: string | null;
}
