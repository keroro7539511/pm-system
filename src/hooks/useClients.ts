import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";
import type { CreateClientPayload, UpdateClientPayload } from "@/types";

export const CLIENTS_KEY = ["clients"] as const;

export function useClients() {
  const qc = useQueryClient();

  useEffect(() => {
    const unlisten = listen("client:created", () => {
      void qc.invalidateQueries({ queryKey: CLIENTS_KEY });
    });
    return () => { void unlisten.then((f) => f()); };
  }, [qc]);

  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: () => api.clients.getAll(),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClientPayload) => api.clients.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClientPayload }) =>
      api.clients.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.clients.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLIENTS_KEY }),
  });
}
