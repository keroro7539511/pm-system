import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, User, BookUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentsPane } from "@/components/documents/DocumentsPane";
import { ContactsPane }  from "@/components/documents/ContactsPane";
import { EmployeesPane } from "@/components/documents/EmployeesPane";

type Tab = "documents" | "contacts" | "employees";

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors",
        active ? "bg-layer-3 text-text-primary" : "text-text-muted hover:text-text-secondary"
      )}
    >
      {children}
    </button>
  );
}

export function Documents() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("documents");

  return (
    <div className="flex flex-col h-full overflow-hidden">
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

      {tab === "documents" && <DocumentsPane />}
      {tab === "contacts"  && <ContactsPane />}
      {tab === "employees" && <EmployeesPane />}
    </div>
  );
}
