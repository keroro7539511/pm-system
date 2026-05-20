import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateMeetingPayload, UpdateMeetingPayload, ActionItemInput } from "@/types";

const MEETINGS_KEY = ["meetings"] as const;
const actionItemsKey = (id: number) => ["action_items", id] as const;

export function useMeetings(search?: string) {
  return useQuery({
    queryKey: [...MEETINGS_KEY, search],
    queryFn: () => api.meetings.getAll(search),
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingPayload) => api.meetings.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEETINGS_KEY }),
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateMeetingPayload }) =>
      api.meetings.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEETINGS_KEY }),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.meetings.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEETINGS_KEY }),
  });
}

export function useActionItems(meetingId: number | undefined) {
  return useQuery({
    queryKey: actionItemsKey(meetingId ?? 0),
    queryFn: () => api.meetings.getActionItems(meetingId!),
    enabled: meetingId !== undefined,
  });
}

export function useSaveActionItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, items }: { meetingId: number; items: ActionItemInput[] }) =>
      api.meetings.saveActionItems(meetingId, items),
    onSuccess: (_data, { meetingId }) =>
      qc.invalidateQueries({ queryKey: actionItemsKey(meetingId) }),
  });
}

export function useLinkActionItemTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actionItemId,
      taskId,
    }: {
      actionItemId: number;
      taskId: number;
      meetingId: number;
    }) => api.meetings.linkActionItemTask(actionItemId, taskId),
    onSuccess: (_data, { meetingId }) =>
      qc.invalidateQueries({ queryKey: actionItemsKey(meetingId) }),
  });
}
