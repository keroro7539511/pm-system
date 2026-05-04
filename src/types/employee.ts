export interface Employee {
  id: number;
  name: string;
  email: string | null;
  extension: string | null;
  department: string | null;
  created_at: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string | null;
  extension: string | null;
  department: string | null;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string | null;
  extension?: string | null;
  department?: string | null;
}
