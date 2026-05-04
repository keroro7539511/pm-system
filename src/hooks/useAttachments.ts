import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/tauri";

export function useEmailAttachments(emailId: number | null) {
  return useQuery({
    queryKey: ["email_attachments", emailId],
    queryFn: () => api.attachments.getForEmail(emailId!),
    enabled: emailId !== null,
    staleTime: 0,
  });
}
