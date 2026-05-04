import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateTaskPayload, UpdateTaskPayload } from "@/types";

export const TASKS_KEY = ["tasks"] as const;
export const STATS_KEY = ["task-stats"] as const;
export const TREND_KEY = ["task-trend"] as const;

export function useTasks(status?: string) {
  return useQuery({
    queryKey: [...TASKS_KEY, status],
    queryFn: () => api.tasks.getAll(status),
    staleTime: 0,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => api.tasks.stats(),
    refetchInterval: 60_000,
  });
}

export function useTaskTrend() {
  return useQuery({
    queryKey: TREND_KEY,
    queryFn: () => api.tasks.trend(),
    staleTime: 0,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: TASKS_KEY, refetchType: "all" });
  void qc.invalidateQueries({ queryKey: STATS_KEY });
  void qc.invalidateQueries({ queryKey: TREND_KEY });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => api.tasks.create(payload),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTaskPayload }) =>
      api.tasks.update(id, payload),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.tasks.delete(id),
    onSuccess: () => invalidateAll(qc),
  });
}
