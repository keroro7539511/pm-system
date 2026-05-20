import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FileText, Plus, Search, Trash2, Edit3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { DocumentFormDialog } from "./DocumentFormDialog";
import {
  useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument,
} from "@/hooks/useDocuments";
import type { Document, CreateDocumentPayload } from "@/types";

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

export function DocumentsPane() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const [selectedDoc, setSelectedDoc]           = useState<Document | null>(null);
  const [formOpen, setFormOpen]                  = useState(false);
  const [editingDoc, setEditingDoc]              = useState<Document | null>(null);
  const [previewMode, setPreviewMode]            = useState(true);
  const [deleteConfirm, setDeleteConfirm]        = useState<number | null>(null);
  const [localContent, setLocalContent]          = useState("");

  const { data: docs = [], isLoading } = useDocuments(debouncedSearch || undefined);
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const groupedDocs = useMemo(() => {
    const map = new Map<string, Document[]>();
    for (const doc of docs) {
      const key = doc.doc_type ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return map;
  }, [docs]);

  function handleSelect(doc: Document) {
    setSelectedDoc(doc);
    setLocalContent(doc.content_md ?? "");
    setPreviewMode(true);
    setDeleteConfirm(null);
  }

  function handleSubmit(payload: CreateDocumentPayload) {
    if (editingDoc) {
      updateDoc.mutate({ id: editingDoc.id, payload }, {
        onSuccess: (updated) => {
          setSelectedDoc(updated);
          setLocalContent(updated.content_md ?? "");
          setFormOpen(false);
          setEditingDoc(null);
        },
      });
    } else {
      createDoc.mutate(payload, {
        onSuccess: (created) => {
          setSelectedDoc(created);
          setLocalContent(created.content_md ?? "");
          setFormOpen(false);
        },
      });
    }
  }

  function handleDelete(id: number) {
    deleteDoc.mutate(id, {
      onSuccess: () => {
        if (selectedDoc?.id === id) setSelectedDoc(null);
        setDeleteConfirm(null);
      },
    });
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-text-primary">{t("documents.title")}</h1>
            <Button size="sm" onClick={() => { setEditingDoc(null); setFormOpen(true); }} className="h-7 px-2 text-xs">
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
          {isLoading ? (
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
                  <button key={doc.id} onClick={() => handleSelect(doc)}
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

      {/* Viewer */}
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
                <Button size="sm" variant="ghost" onClick={() => { setEditingDoc(selectedDoc); setFormOpen(true); }} className="text-xs gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />{t("common.edit")}
                </Button>
                {deleteConfirm === selectedDoc.id ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedDoc.id)} disabled={deleteDoc.isPending} className="text-xs h-7">{t("common.confirm")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)} className="text-xs h-7">{t("common.cancel")}</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(selectedDoc.id)}
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

      <DocumentFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingDoc(null); }}
        doc={editingDoc}
        onSubmit={handleSubmit}
        isPending={createDoc.isPending || updateDoc.isPending}
      />
    </div>
  );
}
