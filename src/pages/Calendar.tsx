import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Calendar() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full p-5">
      <h1 className="text-lg font-semibold text-text-primary mb-4">{t("nav.calendar")}</h1>
      <EmptyState
        icon={<CalendarIcon className="w-10 h-10" />}
        title={t("common.comingSoon")}
        description={t("common.comingSoonDesc")}
      />
    </div>
  );
}
