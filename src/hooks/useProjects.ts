import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateProjectPayload, UpdateProjectPayload } from "@/types";

export const PROJECTS_KEY = ["projects"] as const;

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: PROJECTS_KEY });
}

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => api.projects.getAll(),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => api.projects.create(payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProjectPayload }) =>
      api.projects.update(id, payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.projects.delete(id),
    onSuccess: () => invalidate(qc),
  });
}
