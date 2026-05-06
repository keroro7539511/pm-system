import { useTranslation } from "react-i18next";
import { Plus, User, Pencil, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";

interface ClientListProps {
  clients: Client[];
  selectedId: number | null;
  onSelect: (client: Client) => void;
  onNew: () => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onExport: () => void;
  onImportClick: () => void;
  csvImporting?: boolean;
}

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-danger",
  2: "bg-warning",
  3: "bg-text-muted",
};

export function ClientList({ clients, selectedId, onSelect, onNew, onEdit, onDelete, onExport, onImportClick, csvImporting }: ClientListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full w-56 min-w-56 border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-text-muted">{t("nav.emails")}</span>
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onExport} title="匯出 CSV">
            <Download className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onImportClick} disabled={csvImporting} title="從 CSV 匯入">
            <Upload className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onNew}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* All emails shortcut */}
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-layer-2 transition-colors",
            selectedId === null ? "bg-primary/10 text-primary" : "text-text-secondary"
          )}
          onClick={() => onSelect({ id: -1 } as Client)}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="flex-1 text-left truncate text-xs">全部信件</span>
        </button>

        {clients.map((client) => (
          <div
            key={client.id}
            className={cn(
              "group flex items-stretch hover:bg-layer-2 transition-colors",
              selectedId === client.id && "bg-primary/10"
            )}
          >
            {/* 客戶名稱主體 */}
            <button
              className={cn(
                "flex-1 flex items-center gap-2 px-3 py-2 text-left min-w-0",
                selectedId === client.id ? "text-primary" : "text-text-secondary"
              )}
              onClick={() => onSelect(client)}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[client.priority] ?? "bg-text-muted")} />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-xs">{client.name}</span>
                {client.domain && (
                  <span className="block truncate text-[10px] text-text-muted">@{client.domain}</span>
                )}
              </span>
              {client.unread_count > 0 && (
                <span className="shrink-0 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">
                  {client.unread_count}
                </span>
              )}
            </button>

            {/* 編輯 / 刪除（hover 顯示） */}
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-1 gap-0.5 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                className="p-1 rounded text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                title="編輯客戶"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                title="刪除客戶"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center px-3">
            <User className="w-6 h-6 text-text-muted mb-2" />
            <p className="text-xs text-text-muted">尚無客戶</p>
          </div>
        )}
      </div>
    </div>
  );
}
