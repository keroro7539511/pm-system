import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export function Emails() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col h-full p-5">
      <h1 className="text-lg font-semibold text-text-primary mb-4">{t("nav.emails")}</h1>
      <EmptyState
        icon={<Mail className="w-10 h-10" />}
        title={t("common.comingSoon")}
        description={t("common.comingSoonDesc")}
      />
    </div>
  );
}
