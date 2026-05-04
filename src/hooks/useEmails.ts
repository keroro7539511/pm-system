import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";
import type { UpdateEmailPayload } from "@/types";

export const EMAILS_KEY = ["emails"] as const;
export const UNREAD_KEY = ["unread-count"] as const;

export function useEmails(clientId?: number, status?: string) {
  const qc = useQueryClient();

  // Real-time update from n8n webhook
  useEffect(() => {
    const unlisten = listen("email:received", () => {
      void qc.invalidateQueries({ queryKey: EMAILS_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    });
    return () => { void unlisten.then((f) => f()); };
  }, [qc]);

  return useQuery({
    queryKey: [...EMAILS_KEY, clientId, status],
    queryFn: () => api.emails.getAll(clientId, status),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => api.emails.unreadCount(),
    refetchInterval: 30_000,
  });
}

export function useMarkEmailRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.emails.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMAILS_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useDeleteEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.emails.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EMAILS_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_KEY });
    },
  });
}

export function useUpdateEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEmailPayload }) =>
      api.emails.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: EMAILS_KEY }),
  });
}
