import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import type { CreateDocumentPayload, UpdateDocumentPayload } from "@/types";

const DOCS_KEY = ["documents"] as const;

export function useDocuments(search?: string) {
  return useQuery({
    queryKey: [...DOCS_KEY, search],
    queryFn: () => api.documents.getAll(search),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => api.documents.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCS_KEY }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDocumentPayload }) =>
      api.documents.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCS_KEY }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.documents.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCS_KEY }),
  });
}
