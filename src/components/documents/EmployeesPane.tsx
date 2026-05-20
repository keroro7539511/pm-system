import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { User, BookUser, Plus, Search, Trash2, Edit3, Phone, Mail, Building2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { useCsvImport } from "@/hooks/useCsvImport";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import {
  useEmployees, useCreateEmployee, useUpsertEmployee, useUpdateEmployee, useDeleteEmployee,
} from "@/hooks/useEmployees";
import type { Employee, CreateEmployeePayload } from "@/types";

export function EmployeesPane() {
  const { t } = useTranslation();
  const [selected, setSelected]     = useState<Employee | null>(null);
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: employees = [], isLoading } = useEmployees(debouncedSearch || undefined);
  const { data: allEmployees = [] }         = useEmployees(undefined);
  const createEmployee = useCreateEmployee();
  const upsertEmployee = useUpsertEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const importRow = useCallback(async (row: Record<string, string>) => {
    const name = (row["name"] ?? row["姓名"] ?? row["Name"] ?? "").trim();
    if (!name) throw new Error("missing name");
    await upsertEmployee.mutateAsync({
      name,
      email:      (row["email"]      ?? row["Email"] ?? row["信箱"] ?? "").trim() || null,
      extension:  (row["extension"]  ?? row["分機"]  ?? "").trim() || null,
      department: (row["department"] ?? row["部門"]  ?? "").trim() || null,
    });
  }, [upsertEmployee]);

  const { importing: csvImporting, result: csvResult, inputRef: csvInputRef, handleFile: handleCsvFile } =
    useCsvImport(importRow);

  const groupedEmployees = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const e of employees) {
      const key = e.department ?? "（未指定部門）";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [employees]);

  function handleSubmit(payload: CreateEmployeePayload) {
    if (editing) {
      updateEmployee.mutate({ id: editing.id, payload: { name: payload.name, email: payload.email, extension: payload.extension, department: payload.department } }, {
        onSuccess: (updated) => { setSelected(updated); setFormOpen(false); setEditing(null); },
      });
    } else {
      upsertEmployee.mutate(payload, {
        onSuccess: (result) => { setSelected(result); setFormOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!selected) return;
    deleteEmployee.mutate(selected.id, {
      onSuccess: () => { setSelected(null); setDeleteConfirm(false); },
    });
  }

  function handleExport() {
    downloadCsv(
      allEmployees.map((e) => ({
        name:       e.name,
        email:      e.email      ?? "",
        extension:  e.extension  ?? "",
        department: e.department ?? "",
      })),
      `employees_${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-text-primary shrink-0">通訊錄</h1>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={handleExport} disabled={allEmployees.length === 0}
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
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
            <Input placeholder="搜尋姓名、部門..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
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
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-2 mb-1">{dept}</p>
                {items.map((emp) => (
                  <button key={emp.id}
                    onClick={() => { setSelected(emp); setDeleteConfirm(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-start gap-2",
                      selected?.id === emp.id ? "bg-primary/15 text-text-primary" : "text-text-secondary hover:bg-layer-2"
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

      {/* Detail */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-start justify-between px-6 py-4 border-b border-border bg-card-bg shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">{selected.name}</h2>
                  {selected.department && <p className="text-xs text-text-muted">{selected.department}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(selected); setFormOpen(true); }} className="text-xs gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />編輯
                </Button>
                {deleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteEmployee.isPending} className="text-xs h-7">確認刪除</Button>
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
                {selected.email && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-4 h-4 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-0.5">Email</p>
                      <a href={`mailto:${selected.email}`} className="text-sm text-primary hover:underline">
                        {selected.email}
                      </a>
                    </div>
                  </div>
                )}
                {selected.extension && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-4 h-4 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-0.5">分機</p>
                      <p className="text-sm text-text-primary">{selected.extension}</p>
                    </div>
                  </div>
                )}
                {selected.department && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-layer-2 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-0.5">部門</p>
                      <p className="text-sm text-text-primary">{selected.department}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-text-muted mt-6">建立於 {formatDate(selected.created_at)}</p>
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

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        employee={editing}
        onSubmit={handleSubmit}
        isPending={createEmployee.isPending || updateEmployee.isPending}
      />
    </div>
  );
}
