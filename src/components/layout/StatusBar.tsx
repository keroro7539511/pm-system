import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { zhTW, enUS } from "date-fns/locale";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { i18n } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const locale = i18n.language === "zh-TW" ? zhTW : enUS;
  const now = format(new Date(), "yyyy/MM/dd HH:mm", { locale });

  const hasTaskWebhook = Boolean(settings.task_assign_webhook_url);
  const hasN8nUrl      = Boolean(settings.n8n_webhook_url);
  const configured     = hasN8nUrl || hasTaskWebhook;

  return (
    <footer className="flex items-center justify-between px-4 h-7 border-t border-border text-[11px] text-text-muted shrink-0">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              configured ? "bg-success" : "bg-text-muted"
            )}
          />
          n8n{" "}
          {configured ? "已設定" : "未設定"}
        </span>
      </div>
      <span>{now}</span>
    </footer>
  );
}
