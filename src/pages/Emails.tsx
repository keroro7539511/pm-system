import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ClientList } from "@/components/emails/ClientList";
import { EmailList } from "@/components/emails/EmailList";
import { EmailDetail } from "@/components/emails/EmailDetail";
import { ClientFormDialog } from "@/components/emails/ClientFormDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { useEmails, useDeleteEmail } from "@/hooks/useEmails";
import type { Client, Email, CreateClientPayload, UpdateClientPayload } from "@/types";

export function Emails() {
  const { t } = useTranslation();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Client CRUD state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [deletingClient, setDeletingClient] = useState<Client | undefined>();

  // Email delete state
  const [deletingEmail, setDeletingEmail] = useState<Email | undefined>();

  const clientId = selectedClient && selectedClient.id > 0 ? selectedClient.id : undefined;
  const { data: emails = [], isLoading: emailsLoading } = useEmails(clientId);

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const deleteEmail = useDeleteEmail();

  const filteredEmails = useMemo(() => {
    if (!searchQuery) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter((e) =>
      (e.subject ?? "").toLowerCase().includes(q) ||
      (e.sender ?? "").toLowerCase().includes(q) ||
      (e.ai_summary ?? "").toLowerCase().includes(q)
    );
  }, [emails, searchQuery]);

  function handleClientSelect(client: Client) {
    setSelectedClient(client.id === -1 ? null : client);
    setSelectedEmail(null);
  }

  function handleClientFormOpen() {
    setEditingClient(undefined);
    setClientFormOpen(true);
  }

  function handleClientEdit(client: Client) {
    setEditingClient(client);
    setClientFormOpen(true);
  }

  function handleClientFormClose(open: boolean) {
    setClientFormOpen(open);
    if (!open) setEditingClient(undefined);
  }

  function handleClientSubmit(payload: CreateClientPayload) {
    if (editingClient) {
      updateClient.mutate(
        { id: editingClient.id, payload: payload as UpdateClientPayload },
        { onSuccess: () => setClientFormOpen(false) }
      );
    } else {
      createClient.mutate(payload, { onSuccess: () => setClientFormOpen(false) });
    }
  }

  function handleClientDeleteConfirm() {
    if (!deletingClient) return;
    deleteClient.mutate(deletingClient.id, {
      onSuccess: () => {
        if (selectedClient?.id === deletingClient.id) {
          setSelectedClient(null);
          setSelectedEmail(null);
        }
        setDeletingClient(undefined);
      },
    });
  }

  function handleEmailDelete(email: Email) {
    setDeletingEmail(email);
  }

  function handleEmailDeleteConfirm() {
    if (!deletingEmail) return;
    deleteEmail.mutate(deletingEmail.id, {
      onSuccess: () => {
        if (selectedEmail?.id === deletingEmail.id) setSelectedEmail(null);
        setDeletingEmail(undefined);
      },
    });
  }

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Column 1: Client list */}
      <ClientList
        clients={clients}
        selectedId={selectedClient?.id ?? null}
        onSelect={handleClientSelect}
        onNew={handleClientFormOpen}
        onEdit={handleClientEdit}
        onDelete={setDeletingClient}
      />

      {/* Column 2: Email list */}
      <div className="flex flex-col w-72 min-w-72 border-r border-border">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-text-muted">
            {selectedClient ? selectedClient.name : t("nav.emails")}
            {filteredEmails.length > 0 && (
              <span className="ml-1">
                ({searchQuery ? `${filteredEmails.length}/${emails.length}` : filteredEmails.length})
              </span>
            )}
          </span>
        </div>
        {emailsLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          </div>
        ) : (
          <EmailList
            emails={filteredEmails}
            selectedId={selectedEmail?.id ?? null}
            onSelect={setSelectedEmail}
            onDelete={handleEmailDelete}
          />
        )}
      </div>

      {/* Column 3: Email detail */}
      <div className="flex-1 overflow-hidden">
        <EmailDetail
          email={selectedEmail}
          onDelete={handleEmailDelete}
        />
      </div>

      {/* Client form dialog (新增 / 編輯) */}
      <ClientFormDialog
        open={clientFormOpen}
        onOpenChange={handleClientFormClose}
        client={editingClient}
        onSubmit={handleClientSubmit}
        loading={createClient.isPending || updateClient.isPending}
      />

      {/* 刪除客戶確認 */}
      <Dialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除客戶</DialogTitle>
            <DialogDescription>
              確定要刪除「{deletingClient?.name}」？此客戶的信件分類將被移除，但信件本身不會刪除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingClient(undefined)}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleClientDeleteConfirm}
              disabled={deleteClient.isPending}
            >
              {deleteClient.isPending ? "刪除中..." : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除信件確認 */}
      <Dialog open={!!deletingEmail} onOpenChange={(open) => !open && setDeletingEmail(undefined)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>刪除信件</DialogTitle>
            <DialogDescription>
              確定要刪除「{deletingEmail?.subject ?? "(無主旨)"}」？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingEmail(undefined)}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleEmailDeleteConfirm}
              disabled={deleteEmail.isPending}
            >
              {deleteEmail.isPending ? "刪除中..." : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
