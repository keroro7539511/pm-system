import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Documents() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full p-5">
      <h1 className="text-lg font-semibold text-text-primary mb-4">{t("nav.documents")}</h1>
      <EmptyState
        icon={<FolderOpen className="w-10 h-10" />}
        title={t("common.comingSoon")}
        description={t("common.comingSoonDesc")}
      />
    </div>
  );
}
