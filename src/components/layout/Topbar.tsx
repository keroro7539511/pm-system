import { Search, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-5 h-12 border-b border-border shrink-0">
      <div className="flex items-center gap-2 w-72">
        <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <Input
          placeholder={t("common.search") + "..."}
          className="h-7 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 placeholder:text-text-muted"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => void navigate("/tasks")} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          {t("tasks.newTask")}
        </Button>
      </div>
    </header>
  );
}
