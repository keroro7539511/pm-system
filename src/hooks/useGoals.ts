import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateGoalPayload, UpdateGoalPayload } from "@/types";

const ALL_GOALS_KEY = ["goals"] as const;

function projectGoalsKey(projectId: number) {
  return ["project_goals", projectId] as const;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, projectId?: number | null) {
  void qc.invalidateQueries({ queryKey: ALL_GOALS_KEY });
  if (projectId !== undefined && projectId !== null) {
    void qc.invalidateQueries({ queryKey: projectGoalsKey(projectId) });
  }
}

export function useAllGoals(projectId?: number) {
  return useQuery({
    queryKey: [...ALL_GOALS_KEY, projectId ?? null],
    queryFn: () => api.goals.getAll(projectId),
  });
}

export function useProjectGoals(projectId: number | null) {
  return useQuery({
    queryKey: ["project_goals", projectId],
    queryFn: () => api.goals.getForProject(projectId!),
    enabled: projectId !== null,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGoalPayload) => api.goals.create(payload),
    onSuccess: (goal) => invalidateAll(qc, goal.project_id),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateGoalPayload }) =>
      api.goals.update(id, payload),
    onSuccess: (goal) => invalidateAll(qc, goal.project_id),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.goals.delete(id),
    onSuccess: () => invalidateAll(qc),
  });
}
