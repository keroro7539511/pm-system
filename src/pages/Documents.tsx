import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Papa from "papaparse";
import {
  FileText, Plus, Search, Trash2, Edit3, Eye,
  User, Phone, Mail, Building2, MapPin, FolderOpen, BookUser, Upload, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DocumentFormDialog } from "@/components/documents/DocumentFormDialog";
import { ContactFormDialog } from "@/components/documents/ContactFormDialog";
import { EmployeeFormDialog } from "@/components/documents/EmployeeFormDialog";
import {
  useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument,
} from "@/hooks/useDocuments";
import {
  useContacts, useCreateContact, useUpdateContact, useDeleteContact,
} from "@/hooks/useContacts";
import {
  useEmployees, useCreateEmployee, useUpsertEmployee, useUpdateEmployee, useDeleteEmployee,
} from "@/hooks/useEmployees";
import type {
  Document, CreateDocumentPayload,
  Contact, CreateContactPayload,
  Employee, CreateEmployeePayload,
} from "@/types";
import { formatDate } from "@/lib/utils";

// ─── Document helpers ──────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  contract: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  proposal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  report:   "bg-green-500/20 text-green-400 border-green-500/30",
  spec:     "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  other:    "bg-layer-3 text-text-muted border-border",
};

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# "))
          return <h1 key={i} className="text-xl font-bold text-text-primary mb-3 mt-1">{line.slice(2)}</h1>;
        if (line.startsWith("## "))
          return <h2 key={i} className="text-lg font-semibold text-text-primary mb-2 mt-4">{line.slice(3)}</h2>;
        if (line.startsWith("### "))
          return <h3 key={i} className="text-base font-medium text-text-primary mb-1 mt-3">{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* "))
          return <li key={i} className="text-text-secondary ml-4 list-disc">{line.slice(2)}</li>;
        if (line.startsWith("> "))
          return <blockquote key={i} className="border-l-2 border-primary pl-3 text-text-muted italic">{line.slice(2)}</blockquote>;
        if (line === "") return <div key={i} className="h-2" />;
        return <p key={i} className="text-text-secondary leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

// ─── Contact detail card ───────────────────────────────────────

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

// ─── Tab button ────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors",
        active
          ? "bg-layer-3 text-text-primary"
          : "text-text-muted hover:text-text-secondary"
      )}
    >
      {children}
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export function Documents() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [tab, setTab] = useState<"documents" | "contacts" | "employees">("documents");

  // Document state
  const [selectedDoc, setSelectedDoc]           = useState<Document | null>(null);
  const [docFormOpen, setDocFormOpen]            = useState(false);
  const [editingDoc, setEditingDoc]              = useState<Document | null>(null);
  const [previewMode, setPreviewMode]            = useState(true);
  const [docDeleteConfirm, setDocDeleteConfirm] = useState<number | null>(null);
  const [localContent, setLocalContent]         = useState("");

  // Contact state
  const [selectedContact, setSelectedContact]           = useState<Contact | null>(null);
  const [contactFormOpen, setContactFormOpen]            = useState(false);
  const [editingContact, setEditingContact]              = useState<Contact | null>(null);
  const [contactDeleteConfirm, setContactDeleteConfirm] = useState(false);
  const [contactSearch, setContactSearch]                = useState("");
  const [debouncedContactSearch, setDebouncedContactSearch] = useState("");

  // Employee state
  const [selectedEmployee, setSelectedEmployee]           = useState<Employee | null>(null);
  const [employeeFormOpen, setEmployeeFormOpen]            = useState(false);
  const [editingEmployee, setEditingEmployee]              = useState<Employee | null>(null);
  const [employeeDeleteConfirm, setEmployeeDeleteConfirm] = useState(false);
  const [employeeSearch, setEmployeeSearch]                = useState("");
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState("");
  const [csvImporting, setCsvImporting]                    = useState(false);
  const [csvResult, setCsvResult]                          = useState<{ ok: number; fail: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [contactCsvImporting, setContactCsvImporting]      = useState(false);
  const [contactCsvResult, setContactCsvResult]            = useState<{ ok: number; fail: number } | null>(null);
  const contactCsvInputRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading: docsLoading }         = useDocuments(debouncedSearch || undefined);
  const { data: contacts = [], isLoading: contactsLoading } = useContacts(null, debouncedContactSearch || undefined);
  const { data: employees = [], isLoading: employeesLoading } = useEmployees(debouncedEmployeeSearch || undefined);
  const { data: allEmployees = [] } = useEmployees(undefined);

  const createDoc      = useCreateDocument();
  const updateDoc      = useUpdateDocument();
  const deleteDoc      = useDeleteDocument();
  const createContact  = useCreateContact();
  const updateContact  = useUpdateContact();
  const deleteContact  = useDeleteContact();
  const createEmployee = useCreateEmployee();
  const upsertEmployee = useUpsertEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedContactSearch(contactSearch), 300);
    return () => clearTimeout(t);
  }, [contactSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmployeeSearch(employeeSearch), 300);
    return () => clearTimeout(t);
  }, [employeeSearch]);

  const groupedDocs = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const doc of docs) {
      const key = doc.doc_type ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return map;
  }, [docs]);

  const groupedContacts = useMemo(() => {
    const map = new Map<string, Contact[]>();
    for (const c of contacts) {
      const key = c.project_name ?? "（未指定專案）";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [contacts]);

  const groupedEmployees = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const e of employees) {
      const key = e.department ?? "（未指定部門）";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [employees]);

  function handleDocSelect(doc: Document) {
    setSelectedDoc(doc);
    setLocalContent(doc.content_md ?? "");
    setPreviewMode(true);
    setDocDeleteConfirm(null);
  }

  function handleDocSubmit(payload: CreateDocumentPayload) {
    if (editingDoc) {
      updateDoc.mutate({ id: editingDoc.id, payload }, {
        onSuccess: (updated) => {
          setSelectedDoc(updated);
          setLocalContent(updated.content_md ?? "");
          setDocFormOpen(false);
          setEditingDoc(null);
        },
      });
    } else {
      createDoc.mutate(payload, {
        onSuccess: (created) => {
          setSelectedDoc(created);
          setLocalContent(created.content_md ?? "");
          setDocFormOpen(false);
        },
      });
    }
  }

  function handleDocDelete(id: number) {
    deleteDoc.mutate(id, {
      onSuccess: () => {
        if (selectedDoc?.id === id) setSelectedDoc(null);
        setDocDeleteConfirm(null);
      },
    });
  }

  function handleContactSubmit(payload: CreateContactPayload) {
    if (editingContact) {
      updateContact.mutate({ id: editingContact.id, payload }, {
        onSuccess: (updated) => {
          setSelectedContact(updated);
          setContactFormOpen(false);
          setEditingContact(null);
        },
      });
    } else {
      createContact.mutate(payload, {
        onSuccess: (created) => {
          setSelectedContact(created);
          setContactFormOpen(false);
        },
      });
    }
  }

  function handleContactDelete() {
    if (!selectedContact) return;
    deleteContact.mutate(selectedContact.id, {
      onSuccess: () => { setSelectedContact(null); setContactDeleteConfirm(false); },
    });
  }

  function handleEmployeeSubmit(payload: CreateEmployeePayload) {
    if (editingEmployee) {
      updateEmployee.mutate({ id: editingEmployee.id, payload: { name: payload.name, email: payload.email, extension: payload.extension, department: payload.department } }, {
        onSuccess: (updated) => {
          setSelectedEmployee(updated);
          setEmployeeFormOpen(false);
          setEditingEmployee(null);
        },
      });
    } else {
      upsertEmployee.mutate(payload, {
        onSuccess: (result) => {
          setSelectedEmployee(result);
          setEmployeeFormOpen(false);
        },
      });
    }
  }

  function handleEmployeeDelete() {
    if (!selectedEmployee) return;
    deleteEmployee.mutate(selectedEmployee.id, {
      onSuccess: () => { setSelectedEmployee(null); setEmployeeDeleteConfirm(false); },
    });
  }

  function handleContactCsvExport() {
    const rows = contacts.map((c) => ({
      name:            c.name,
      email:           c.email           ?? "",
      phone:           c.phone           ?? "",
      company_name:    c.company_name    ?? "",
      company_address: c.company_address ?? "",
      notes:           c.notes           ?? "",
    }));
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleContactCsvFile(file: File) {
    setContactCsvImporting(true);
    setContactCsvResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let ok = 0;
        let fail = 0;
        for (const row of results.data) {
          const name = row["name"] ?? row["姓名"] ?? row["Name"] ?? "";
          if (!name.trim()) { fail++; continue; }
          try {
            await createContact.mutateAsync({
              name:            name.trim(),
              email:           (row["email"]           ?? row["Email"]    ?? row["信箱"] ?? "").trim() || null,
              phone:           (row["phone"]           ?? row["Phone"]    ?? row["電話"] ?? "").trim() || null,
              company_name:    (row["company_name"]    ?? row["公司"]     ?? "").trim() || null,
              company_address: (row["company_address"] ?? row["地址"]     ?? "").trim() || null,
              notes:           (row["notes"]           ?? row["備註"]     ?? "").trim() || null,
            });
            ok++;
          } catch {
            fail++;
          }
        }
        setContactCsvImporting(false);
        setContactCsvResult({ ok, fail });
        if (contactCsvInputRef.current) contactCsvInputRef.current.value = "";
      },
      error: () => {
        setContactCsvImporting(false);
        setContactCsvResult({ ok: 0, fail: -1 });
      },
    });
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
          const name = row["name"] ?? row["姓名"] ?? row["Name"] ?? "";
          if (!name.trim()) { fail++; continue; }
          try {
            await upsertEmployee.mutateAsync({
              name:       name.trim(),
              email:      (row["email"] ?? row["Email"] ?? row["信箱"] ?? "").trim() || null,
              extension:  (row["extension"] ?? row["分機"] ?? "").trim() || null,
              department: (row["department"] ?? row["部門"] ?? "").trim() || null,
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

  function handleCsvExport() {
    const rows = allEmployees.map((e) => ({
      name:       e.name,
      email:      e.email      ?? "",
      extension:  e.extension  ?? "",
      department: e.department ?? "",
    }));
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 shrink-0 border-b border-border bg-sidebar">
        <div className="flex items-center gap-0.5 bg-layer-2 p-1 rounded-md">
          <TabBtn active={tab === "documents"} onClick={() => setTab("documents")}>
            <FileText className="w-3.5 h-3.5" />{t("documents.title")}
          </TabBtn>
          <TabBtn active={tab === "contacts"} onClick={() => setTab("contacts")}>
            <User className="w-3.5 h-3.5" />客戶窗口
          </TabBtn>
          <TabBtn active={tab === "employees"} onClick={() => setTab("employees")}>
            <BookUser className="w-3.5 h-3.5" />通訊錄
          </TabBtn>
        </div>
      </div>

      {/* ── Documents ─────────────────────────────────── */}
      {tab === "documents" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-text-primary">{t("documents.title")}</h1>
                <Button size="sm" onClick={() => { setEditingDoc(null); setDocFormOpen(true); }} className="h-7 px-2 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />{t("documents.new")}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
                <Input
                  placeholder={t("documents.search")}
                  value={search}
                  onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {docsLoading ? (
                <p className="text-sm text-text-muted p-3">{t("common.loading")}</p>
              ) : docs.length === 0 ? (
                <div className="p-4 text-center">
                  <FileText className="h-10 w-10 mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">{t("documents.noDocuments")}</p>
                  <p className="text-xs text-text-muted mt-1">{t("documents.noDocumentsDesc")}</p>
                </div>
              ) : (
                Array.from(groupedDocs.entries()).map(([type, items]) => (
                  <div key={type} className="mb-3">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-2 mb-1">
                      {t(`documents.types.${type}`, { defaultValue: type })}
                    </p>
                    {items.map((doc) => (
                      <button key={doc.id} onClick={() => handleDocSelect(doc)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2",
                          selectedDoc?.id === doc.id ? "bg-primary/15 text-text-primary" : "text-text-secondary hover:bg-layer-2"
                        )}
                      >
                        <FileText className="h-4 w-4 shrink-0 mt-0.5 text-text-muted" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.name}</p>
                          {doc.version && <p className="text-xs text-text-muted">{doc.version}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document viewer */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedDoc ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card-bg shrink-0">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{selectedDoc.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedDoc.doc_type && (
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", TYPE_COLORS[selectedDoc.doc_type] ?? TYPE_COLORS.other)}>
                          {t(`documents.types.${selectedDoc.doc_type}`, { defaultValue: selectedDoc.doc_type })}
                        </span>
                      )}
                      {selectedDoc.version && <Badge variant="muted" className="text-xs">{selectedDoc.version}</Badge>}
                      {selectedDoc.expires_at && <span className="text-xs text-text-muted">到期：{formatDate(selectedDoc.expires_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewMode(!previewMode)} className="text-xs gap-1.5">
                      {previewMode
                        ? <><Edit3 className="h-3.5 w-3.5" />{t("documents.edit_content")}</>
                        : <><Eye className="h-3.5 w-3.5" />{t("documents.preview")}</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingDoc(selectedDoc); setDocFormOpen(true); }} className="text-xs gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" />{t("common.edit")}
                    </Button>
                    {docDeleteConfirm === selectedDoc.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="destructive" onClick={() => handleDocDelete(selectedDoc.id)} disabled={deleteDoc.isPending} className="text-xs h-7">{t("common.confirm")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDocDeleteConfirm(null)} className="text-xs h-7">{t("common.cancel")}</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setDocDeleteConfirm(selectedDoc.id)}
                        className="text-xs gap-1.5 text-danger hover:text-danger hover:bg-danger/10">
                        <Trash2 className="h-3.5 w-3.5" />{t("common.delete")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {localContent ? (
                    previewMode ? (
                      <div className="max-w-3xl"><MarkdownPreview content={localContent} /></div>
                    ) : (
                      <textarea
                        className="w-full h-full min-h-[400px] bg-transparent text-text-secondary font-mono text-sm resize-none outline-none border border-border rounded-lg p-4 focus:border-primary transition-colors"
                        value={localContent}
                        onChange={(e) => setLocalContent(e.target.value)}
                        onBlur={() => {
                          if (selectedDoc) updateDoc.mutate({ id: selectedDoc.id, payload: { content_md: localContent } });
                        }}
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                      <FileText className="h-16 w-16 mb-3 opacity-30" />
                      <p>{t("documents.noContent")}</p>
                      <Button className="mt-4" variant="outline" size="sm" onClick={() => setPreviewMode(false)}>
                        {t("documents.edit_content")}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <FileText className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-lg">{t("documents.noDocuments")}</p>
                <p className="text-sm mt-1">{t("documents.noDocumentsDesc")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Contacts ──────────────────────────────────── */}
      {tab === "contacts" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-semibold text-text-primary shrink-0">客戶窗口</h1>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="ghost"
                    onClick={handleContactCsvExport}
                    disabled={contacts.length === 0}
                    className="h-7 w-7 p-0"
                    title="匯出 CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => contactCsvInputRef.current?.click()}
                    disabled={contactCsvImporting}
                    className="h-7 w-7 p-0"
                    title="從 CSV 匯入"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" onClick={() => { setEditingContact(null); setContactFormOpen(true); }} className="h-7 px-2 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />新增
                  </Button>
                </div>
              </div>
              {contactCsvResult && (
                <p className={`text-xs px-1 ${contactCsvResult.fail === -1 || (contactCsvResult.ok === 0 && contactCsvResult.fail > 0) ? "text-danger" : "text-success"}`}>
                  {contactCsvResult.fail === -1
                    ? "CSV 解析失敗，請確認格式"
                    : `匯入完成：${contactCsvResult.ok} 筆成功${contactCsvResult.fail > 0 ? `，${contactCsvResult.fail} 筆失敗` : ""}`}
                </p>
              )}
              <input
                ref={contactCsvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleContactCsvFile(e.target.files[0]); }}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
                <Input
                  placeholder="搜尋姓名、公司..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {contactsLoading ? (
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
                        onClick={() => { setSelectedContact(contact); setContactDeleteConfirm(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2",
                          selectedContact?.id === contact.id ? "bg-primary/15 text-text-primary" : "text-text-secondary hover:bg-layer-2"
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

          {/* Contact detail */}
          <div className="flex-1 overflow-hidden">
            {selectedContact ? (
              <ContactCard
                contact={selectedContact}
                onEdit={() => { setEditingContact(selectedContact); setContactFormOpen(true); }}
                onDelete={handleContactDelete}
                deleteConfirm={contactDeleteConfirm}
                setDeleteConfirm={setContactDeleteConfirm}
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
        </div>
      )}

      {/* ── Employees ─────────────────────────────────── */}
      {tab === "employees" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-semibold text-text-primary shrink-0">通訊錄</h1>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="ghost"
                    onClick={handleCsvExport}
                    disabled={allEmployees.length === 0}
                    className="h-7 w-7 p-0"
                    title="匯出 CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => csvInputRef.current?.click()}
                    disabled={csvImporting}
                    className="h-7 w-7 p-0"
                    title="從 CSV 匯入"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" onClick={() => { setEditingEmployee(null); setEmployeeFormOpen(true); }} className="h-7 px-2 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />新增
                  </Button>
                </div>
              </div>
              {/* CSV result feedback */}
              {csvResult && (
                <div className={cn(
                  "text-xs px-2 py-1.5 rounded-md",
                  csvResult.fail === -1
                    ? "bg-danger/10 text-danger"
                    : csvResult.fail > 0
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                )}>
                  {csvResult.fail === -1
                    ? "CSV 解析失敗，請確認格式"
                    : `匯入完成：${csvResult.ok} 筆成功${csvResult.fail > 0 ? `，${csvResult.fail} 筆失敗` : ""}`}
                </div>
              )}
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
                <Input
                  placeholder="搜尋姓名、部門..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {employeesLoading ? (
                <p className="text-sm text-text-muted p-3">{t("common.loading")}</p>
              ) : employees.length === 0 ? (
                <div className="p-4 text-center">
                  <BookUser className="h-10 w-10 mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">尚無員工資料</p>
                  <p className="text-xs text-text-muted mt-1">點擊「新增」建立第一筆</p>
                </div>
              ) : (
                Array.from(groupedEmployees.entries()).map(([dept, items]) => (
                  <div key={dept} className="mb-3">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-2 mb-1">
                      {dept}
                    </p>
                    {items.map((emp) => (
                      <button key={emp.id}
                        onClick={() => { setSelectedEmployee(emp); setEmployeeDeleteConfirm(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2",
                          selectedEmployee?.id === emp.id ? "bg-primary/15 text-text-primary" : "text-text-secondary hover:bg-layer-2"
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="h-3 w-3 text-purple" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{emp.name}</p>
                          <p className="text-xs text-text-muted truncate">{emp.email ?? emp.extension ?? "—"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Employee detail */}
          <div className="flex-1 overflow-hidden">
            {selectedEmployee ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-card-bg shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple/20 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-purple" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">{selectedEmployee.name}</h2>
                      {selectedEmployee.department && (
                        <p className="text-xs text-text-muted">{selectedEmployee.department}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingEmployee(selectedEmployee); setEmployeeFormOpen(true); }} className="text-xs gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" />編輯
                    </Button>
                    {employeeDeleteConfirm ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="destructive" onClick={handleEmployeeDelete} disabled={deleteEmployee.isPending} className="text-xs h-7">確認刪除</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEmployeeDeleteConfirm(false)} className="text-xs h-7">取消</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEmployeeDeleteConfirm(true)}
                        className="text-xs gap-1.5 text-danger hover:text-danger hover:bg-danger/10">
                        <Trash2 className="h-3.5 w-3.5" />刪除
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-lg space-y-4">
                    {selectedEmployee.email && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                          <Mail className="w-4 h-4 text-text-muted" />
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">Email</p>
                          <a href={`mailto:${selectedEmployee.email}`} className="text-sm text-primary hover:underline">
                            {selectedEmployee.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {selectedEmployee.extension && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-4 h-4 text-text-muted" />
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">分機</p>
                          <p className="text-sm text-text-primary">{selectedEmployee.extension}</p>
                        </div>
                      </div>
                    )}
                    {selectedEmployee.department && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4 text-text-muted" />
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">部門</p>
                          <p className="text-sm text-text-primary">{selectedEmployee.department}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-text-muted mt-6">建立於 {formatDate(selectedEmployee.created_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <BookUser className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-lg">選擇員工以查看資料</p>
                <p className="text-sm mt-1">或點擊「新增」建立第一筆</p>
              </div>
            )}
          </div>
        </div>
      )}

      <DocumentFormDialog
        open={docFormOpen}
        onOpenChange={(open) => { setDocFormOpen(open); if (!open) setEditingDoc(null); }}
        doc={editingDoc}
        onSubmit={handleDocSubmit}
        isPending={createDoc.isPending || updateDoc.isPending}
      />

      <ContactFormDialog
        open={contactFormOpen}
        onOpenChange={(open) => { setContactFormOpen(open); if (!open) setEditingContact(null); }}
        contact={editingContact}
        onSubmit={handleContactSubmit}
        isPending={createContact.isPending || updateContact.isPending}
      />

      <EmployeeFormDialog
        open={employeeFormOpen}
        onOpenChange={(open) => { setEmployeeFormOpen(open); if (!open) setEditingEmployee(null); }}
        employee={editingEmployee}
        onSubmit={handleEmployeeSubmit}
        isPending={createEmployee.isPending || updateEmployee.isPending}
      />
    </div>
  );
}
