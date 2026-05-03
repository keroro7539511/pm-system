import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { ClientList } from "@/components/emails/ClientList";
import { EmailList } from "@/components/emails/EmailList";
import { EmailDetail } from "@/components/emails/EmailDetail";
import { ClientFormDialog } from "@/components/emails/ClientFormDialog";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { useEmails } from "@/hooks/useEmails";
import type { Client, Email, CreateClientPayload } from "@/types";

export function Emails() {
  const { t } = useTranslation();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [clientFormOpen, setClientFormOpen] = useState(false);

  const clientId = selectedClient && selectedClient.id > 0 ? selectedClient.id : undefined;
  const { data: emails = [], isLoading: emailsLoading } = useEmails(clientId);

  const createClient = useCreateClient();

  function handleClientSelect(client: Client) {
    if (client.id === -1) {
      setSelectedClient(null);
    } else {
      setSelectedClient(client);
    }
    setSelectedEmail(null);
  }

  function handleCreateClient(payload: CreateClientPayload) {
    createClient.mutate(payload, { onSuccess: () => setClientFormOpen(false) });
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
        onNew={() => setClientFormOpen(true)}
      />

      {/* Column 2: Email list */}
      <div className="flex flex-col w-72 min-w-72 border-r border-border">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-text-muted">
            {selectedClient ? selectedClient.name : t("nav.emails")}
            {emails.length > 0 && <span className="ml-1">({emails.length})</span>}
          </span>
        </div>
        {emailsLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          </div>
        ) : (
          <EmailList
            emails={emails}
            selectedId={selectedEmail?.id ?? null}
            onSelect={setSelectedEmail}
          />
        )}
      </div>

      {/* Column 3: Email detail */}
      <div className="flex-1 overflow-hidden">
        <EmailDetail email={selectedEmail} />
      </div>

      <ClientFormDialog
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        onSubmit={handleCreateClient}
        loading={createClient.isPending}
      />
    </div>
  );
}
