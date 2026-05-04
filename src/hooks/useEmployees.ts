import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateEmployeePayload, UpdateEmployeePayload } from "@/types";

const QUERY_KEY = "employees";

export function useEmployees(search?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, search],
    queryFn: () => api.employees.getAll(search),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => api.employees.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpsertEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => api.employees.upsert(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEmployeePayload }) =>
      api.employees.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.employees.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
