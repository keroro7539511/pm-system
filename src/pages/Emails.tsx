import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/toastStore";
import Papa from "papaparse";
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

  // Block domain state
  const [blockingDomain, setBlockingDomain] = useState<{ email: Email; domain: string } | null>(null);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);

  const clientId = selectedClient && selectedClient.id > 0 ? selectedClient.id : undefined;
  const { data: emails = [], isLoading: emailsLoading } = useEmails(clientId);

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const deleteEmail = useDeleteEmail();

  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ ok: number; fail: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const filteredEmails = useMemo(() => {
    if (!searchQuery) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter((e) =>
      (e.subject ?? "").toLowerCase().includes(q) ||
      (e.sender ?? "").toLowerCase().includes(q) ||
      (e.ai_summary ?? "").toLowerCase().includes(q)
    );
  }, [emails, searchQuery]);

  // Keep selectedEmail in sync with re-fetched emails so EmailDetail reflects the latest status
  const liveSelectedEmail = useMemo(
    () => selectedEmail != null
      ? (emails.find(e => e.id === selectedEmail.id) ?? selectedEmail)
      : null,
    [emails, selectedEmail]
  );

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

  function extractDomain(sender: string | null): string {
    if (!sender) return "";
    const m = sender.match(/@([a-zA-Z0-9._-]+)/);
    return m ? m[1].toLowerCase() : "";
  }

  function handleBlockDomain(email: Email) {
    const domain = extractDomain(email.sender);
    if (!domain) {
      toast("無法從寄件者解析 Domain", "error");
      return;
    }
    setBlockingDomain({ email, domain });
  }

  function handleBlockDomainConfirm() {
    if (!blockingDomain) return;
    const { domain } = blockingDomain;
    const existing = settings.email_blacklist_domains
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    if (existing.includes(domain)) {
      toast(`${domain} 已在封鎖清單中`, "info");
      setBlockingDomain(null);
      return;
    }
    const updated = { ...settings, email_blacklist_domains: [...existing, domain].join("\n") };
    updateSettings(updated)
      .then(() => {
        toast(`已封鎖 ${domain}`, "success");
        setBlockingDomain(null);
      })
      .catch((e: unknown) => toast(`儲存失敗：${String(e)}`, "error"));
  }

  function handleCsvExport() {
    const rows = clients.map((c) => ({
      name:           c.name,
      contact_person: c.contact_person ?? "",
      email:          c.email          ?? "",
      phone:          c.phone          ?? "",
      industry:       c.industry       ?? "",
      priority:       c.priority,
      notes:          c.notes          ?? "",
      domain:         c.domain         ?? "",
    }));
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCsvFile(file: File) {
    setCsvImporting(true);
    setCsvResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let ok = 0;
        let fail = 0;
        for (const row of results.data) {
          const name = (row["name"] ?? row["名稱"] ?? row["客戶名稱"] ?? "").trim();
          if (!name) { fail++; continue; }
          const priorityRaw = (row["priority"] ?? row["優先度"] ?? "").trim();
          const priorityNum = Number(priorityRaw);
          const priority = (priorityNum === 1 || priorityNum === 2 || priorityNum === 3) ? priorityNum : 2;
          try {
            await createClient.mutateAsync({
              name,
              contact_person: (row["contact_person"] ?? row["聯絡人"] ?? "").trim() || undefined,
              email:          (row["email"]          ?? row["信箱"]   ?? "").trim() || undefined,
              phone:          (row["phone"]          ?? row["電話"]   ?? "").trim() || undefined,
              industry:       (row["industry"]       ?? row["產業"]   ?? "").trim() || undefined,
              priority: priority as 1 | 2 | 3,
              notes:          (row["notes"]          ?? row["備註"]   ?? "").trim() || undefined,
              domain:         (row["domain"]         ?? row["網域"]   ?? "").trim() || undefined,
            });
            ok++;
          } catch {
            fail++;
          }
        }
        setCsvImporting(false);
        setCsvResult({ ok, fail });
        if (csvInputRef.current) csvInputRef.current.value = "";
      },
      error: () => {
        setCsvImporting(false);
        setCsvResult({ ok: 0, fail: -1 });
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
      <div className="relative flex flex-col">
        <ClientList
          clients={clients}
          selectedId={selectedClient?.id ?? null}
          onSelect={handleClientSelect}
          onNew={handleClientFormOpen}
          onEdit={handleClientEdit}
          onDelete={setDeletingClient}
          onExport={handleCsvExport}
          onImportClick={() => csvInputRef.current?.click()}
          csvImporting={csvImporting}
        />
        {csvResult && (
          <div className={`absolute bottom-2 left-2 right-2 text-[10px] rounded px-2 py-1 text-center ${
            csvResult.fail === -1 ? "bg-danger/20 text-danger" :
            csvResult.fail > 0    ? "bg-warning/20 text-warning" :
                                    "bg-success/20 text-success"
          }`}>
            {csvResult.fail === -1
              ? "CSV 格式錯誤"
              : csvResult.fail > 0
              ? `匯入 ${csvResult.ok} 筆，${csvResult.fail} 筆失敗`
              : `匯入 ${csvResult.ok} 筆完成`}
          </div>
        )}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
        />
      </div>

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
            onBlockDomain={handleBlockDomain}
          />
        )}
      </div>

      {/* Column 3: Email detail */}
      <div className="flex-1 overflow-hidden">
        <EmailDetail
          email={liveSelectedEmail}
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

      {/* 封鎖 Domain 確認 */}
      <Dialog open={!!blockingDomain} onOpenChange={(open) => !open && setBlockingDomain(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-4 h-4 text-warning" />
              封鎖 Domain
            </DialogTitle>
            <DialogDescription>
              封鎖後，來自此 Domain 的新信件將不會進入資料庫。
            </DialogDescription>
          </DialogHeader>
          {blockingDomain && (
            <div className="rounded-lg border border-border bg-layer-2 px-4 py-3 text-sm space-y-1">
              <p><span className="text-text-muted">寄件者：</span><span className="text-text-primary">{blockingDomain.email.sender ?? "—"}</span></p>
              <p><span className="text-text-muted">Domain：</span><span className="text-warning font-medium">{blockingDomain.domain}</span></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockingDomain(null)}>取消</Button>
            <Button variant="destructive" onClick={handleBlockDomainConfirm}>
              確認封鎖
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
