import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateProjectPayload } from "@/types";

export const PROJECTS_KEY = ["projects"] as const;

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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
