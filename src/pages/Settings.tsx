import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/tauri";
import type { AppSettings } from "@/types";

export function Settings() {
  const { t } = useTranslation();
  const { settings, update } = useSettingsStore();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestN8n() {
    setN8nStatus("testing");
    try {
      const ok = await api.settings.testN8n(form.n8n_webhook_url);
      setN8nStatus(ok ? "ok" : "fail");
    } catch {
      setN8nStatus("fail");
    }
    setTimeout(() => setN8nStatus("idle"), 3000);
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-5 gap-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">{t("settings.title")}</h1>

      {/* n8n Integration */}
      <section className="glass-card p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary">{t("settings.n8n.title")}</h2>

        <div className="flex flex-col gap-1.5">
          <Label>{t("settings.n8n.webhookUrl")}</Label>
          <div className="flex gap-2">
            <Input
              value={form.n8n_webhook_url}
              onChange={(e) => set("n8n_webhook_url", e.target.value)}
              placeholder={t("settings.n8n.webhookUrlPlaceholder")}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestN8n}
              disabled={!form.n8n_webhook_url || n8nStatus === "testing"}
              className="shrink-0"
            >
              {n8nStatus === "testing" ? t("settings.n8n.testing") : t("settings.n8n.testConnection")}
            </Button>
          </div>
          {n8nStatus === "ok" && (
            <p className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t("settings.n8n.testSuccess")}
            </p>
          )}
          {n8nStatus === "fail" && (
            <p className="flex items-center gap-1 text-xs text-danger">
              <XCircle className="w-3.5 h-3.5" /> {t("settings.n8n.testFailed")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("settings.n8n.localPort")}</Label>
            <Input
              type="number"
              value={form.n8n_local_port}
              onChange={(e) => set("n8n_local_port", Number(e.target.value))}
              min={1024}
              max={65535}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("settings.n8n.hmacSecret")}</Label>
            <Input
              type="password"
              value={form.n8n_hmac_secret}
              onChange={(e) => set("n8n_hmac_secret", e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{t("settings.notifications.title")}</h2>
        <div className="flex items-center justify-between">
          <Label className="text-text-secondary text-sm">{t("settings.notifications.enabled")}</Label>
          <Switch
            checked={form.notifications_enabled}
            onCheckedChange={(v) => set("notifications_enabled", v)}
          />
        </div>
      </section>

      {/* Appearance */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{t("settings.appearance.title")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("settings.appearance.language")}</Label>
            <Select value={form.language} onValueChange={(v) => set("language", v as AppSettings["language"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-TW">繁體中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("settings.appearance.theme")}</Label>
            <Select value={form.theme} onValueChange={(v) => set("theme", v as AppSettings["theme"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("settings.appearance.themes.dark")}</SelectItem>
                <SelectItem value="light">{t("settings.appearance.themes.light")}</SelectItem>
                <SelectItem value="system">{t("settings.appearance.themes.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="glass-card p-4 flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-primary">{t("settings.about.title")}</h2>
        <p className="text-xs text-text-muted">{t("settings.about.version")}: 0.1.0</p>
        <p className="text-xs text-text-muted">PM System — Tauri 2.0 + React + TypeScript</p>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("common.loading") : saved ? t("settings.saved") : t("settings.save")}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5" /> {t("settings.saved")}
          </span>
        )}
      </div>
    </div>
  );
}
