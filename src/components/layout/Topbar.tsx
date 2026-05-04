import { Search, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopbarProps {
  onNewTask: () => void;
}

export function Topbar({ onNewTask }: TopbarProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearchParams(v ? { q: v } : {}, { replace: true });
  }

  function clearSearch() {
    setSearchParams({}, { replace: true });
  }

  return (
    <header className="flex items-center justify-between px-5 h-12 border-b border-border shrink-0">
      <div className="flex items-center gap-2 w-72 relative">
        <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <Input
          value={query}
          onChange={handleChange}
          placeholder={t("common.search") + "..."}
          className="h-7 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 placeholder:text-text-muted pr-5"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-0 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={onNewTask}>
          <Plus className="w-3.5 h-3.5" />
          {t("tasks.newTask")}
        </Button>
      </div>
    </header>
  );
}
