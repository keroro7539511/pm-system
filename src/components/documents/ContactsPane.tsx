import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { User, Plus, Search, Trash2, Edit3, Phone, Mail, Building2, MapPin, FolderOpen, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { useCsvImport } from "@/hooks/useCsvImport";
import { ContactFormDialog } from "./ContactFormDialog";
import {
  useContacts, useCreateContact, useUpdateContact, useDeleteContact,
} from "@/hooks/useContacts";
import type { Contact, CreateContactPayload } from "@/types";

function ContactCard({
  contact, onEdit, onDelete, deleteConfirm, setDeleteConfirm, isDeleting,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  setDeleteConfirm: (v: boolean) => void;
  isDeleting: boolean;
}) {
  const fields: { icon: React.FC<{ className?: string }>; label: string; value: string | null }[] = [
    { icon: Mail,       label: "Email",  value: contact.email },
    { icon: Phone,      label: "電話",   value: contact.phone },
    { icon: Building2,  label: "公司",   value: contact.company_name },
    { icon: MapPin,     label: "地址",   value: contact.company_address },
    { icon: FolderOpen, label: "專案",   value: contact.project_name },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-card-bg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{contact.name}</h2>
            {contact.company_name && <p className="text-xs text-text-muted">{contact.company_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit} className="text-xs gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />編輯
          </Button>
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={onDelete} disabled={isDeleting} className="text-xs h-7">確認刪除</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(false)} className="text-xs h-7">取消</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(true)}
              className="text-xs gap-1.5 text-danger hover:text-danger hover:bg-danger/10">
              <Trash2 className="h-3.5 w-3.5" />刪除
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg space-y-4">
          {fields.map(({ icon: Icon, label, value }) => value ? (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-text-muted" />
              </div>
              <div>
                <p className="text-xs text-text-muted mb-0.5">{label}</p>
                <p className="text-sm text-text-primary">{value}</p>
              </div>
            </div>
          ) : null)}
          {contact.notes && (
            <div className="mt-4 p-3 rounded-lg bg-layer-2 border border-border">
              <p className="text-xs text-text-muted mb-1">備註</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
          <p className="text-xs text-text-muted mt-6">建立於 {formatDate(contact.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

export function ContactsPane() {
  const { t } = useTranslation();
  const [selected, setSelected]     = useState<Contact | null>(null);
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: contacts = [], isLoading } = useContacts(null, debouncedSearch || undefined);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const importRow = useCallback(async (row: Record<string, string>) => {
    const name = (row["name"] ?? row["姓名"] ?? row["Name"] ?? "").trim();
    if (!name) throw new Error("missing name");
    await createContact.mutateAsync({
      name,
      email:           (row["email"]           ?? row["Email"]    ?? row["信箱"] ?? "").trim() || null,
      phone:           (row["phone"]           ?? row["Phone"]    ?? row["電話"] ?? "").trim() || null,
      company_name:    (row["company_name"]    ?? row["公司"]     ?? "").trim() || null,
      company_address: (row["company_address"] ?? row["地址"]     ?? "").trim() || null,
      notes:           (row["notes"]           ?? row["備註"]     ?? "").trim() || null,
    });
  }, [createContact]);

  const { importing: csvImporting, result: csvResult, inputRef: csvInputRef, handleFile: handleCsvFile } =
    useCsvImport(importRow);

  const groupedContacts = useMemo(() => {
    const map = new Map<string, Contact[]>();
    for (const c of contacts) {
      const key = c.project_name ?? "（未指定專案）";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [contacts]);

  function handleSubmit(payload: CreateContactPayload) {
    if (editing) {
      updateContact.mutate({ id: editing.id, payload }, {
        onSuccess: (updated) => { setSelected(updated); setFormOpen(false); setEditing(null); },
      });
    } else {
      createContact.mutate(payload, {
        onSuccess: (created) => { setSelected(created); setFormOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!selected) return;
    deleteContact.mutate(selected.id, {
      onSuccess: () => { setSelected(null); setDeleteConfirm(false); },
    });
  }

  function handleExport() {
    downloadCsv(
      contacts.map((c) => ({
        name:            c.name,
        email:           c.email           ?? "",
        phone:           c.phone           ?? "",
        company_name:    c.company_name    ?? "",
        company_address: c.company_address ?? "",
        notes:           c.notes           ?? "",
      })),
      `contacts_${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-text-primary shrink-0">客戶窗口</h1>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleExport} disabled={contacts.length === 0}
                className="h-7 w-7 p-0" title="匯出 CSV">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => csvInputRef.current?.click()}
                disabled={csvImporting} className="h-7 w-7 p-0" title="從 CSV 匯入">
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="h-7 px-2 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />新增
              </Button>
            </div>
          </div>
          {csvResult && (
            <p className={`text-xs px-1 ${csvResult.fail === -1 || (csvResult.ok === 0 && csvResult.fail > 0) ? "text-danger" : "text-success"}`}>
              {csvResult.fail === -1
                ? "CSV 解析失敗，請確認格式"
                : `匯入完成：${csvResult.ok} 筆成功${csvResult.fail > 0 ? `，${csvResult.fail} 筆失敗` : ""}`}
            </p>
          )}
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); }} />
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
            <Input placeholder="搜尋姓名、公司..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="text-sm text-text-muted p-3">{t("common.loading")}</p>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-center">
              <User className="h-10 w-10 mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">尚無客戶窗口</p>
              <p className="text-xs text-text-muted mt-1">點擊「新增」建立第一筆</p>
            </div>
          ) : (
            Array.from(groupedContacts.entries()).map(([projectName, items]) => (
              <div key={projectName} className="mb-3">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-2 mb-1 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />{projectName}
                </p>
                {items.map((contact) => (
                  <button key={contact.id}
                    onClick={() => { setSelected(contact); setDeleteConfirm(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2",
                      selected?.id === contact.id ? "bg-primary/15 text-text-primary" : "text-text-secondary hover:bg-layer-2"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{contact.name}</p>
                      <p className="text-xs text-text-muted truncate">{contact.company_name ?? contact.email ?? "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <ContactCard
            contact={selected}
            onEdit={() => { setEditing(selected); setFormOpen(true); }}
            onDelete={handleDelete}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            isDeleting={deleteContact.isPending}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <User className="h-20 w-20 mb-4 opacity-20" />
            <p className="text-lg">選擇客戶窗口以查看資料</p>
            <p className="text-sm mt-1">或點擊「新增」建立第一筆</p>
          </div>
        )}
      </div>

      <ContactFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        contact={editing}
        onSubmit={handleSubmit}
        isPending={createContact.isPending || updateContact.isPending}
      />
    </div>
  );
}
