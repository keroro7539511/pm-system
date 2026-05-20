import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Download, RefreshCw, ArrowDownToLine, Mail, Loader2, Unlink } from "lucide-react";
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
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email: string | null } | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSyncing, setGmailSyncing] = useState(false);
  const [gmailMsg, setGmailMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  type UpdateStatus = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "error";
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateNotes, setUpdateNotes] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState(0);
  const [currentVersion, setCurrentVersion] = useState("0.1.0");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setCurrentVersion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.gmail.getStatus().then(setGmailStatus).catch(() => {});
  }, []);

  async function handleGmailConnect() {
    setGmailLoading(true);
    setGmailMsg(null);
    try {
      const status = await api.gmail.startAuth();
      setGmailStatus(status);
      setGmailMsg({ type: "ok", text: `已連接：${status.email ?? "未知帳號"}` });
    } catch (e) {
      setGmailMsg({ type: "err", text: String(e) });
    } finally {
      setGmailLoading(false);
    }
  }

  async function handleGmailSync() {
    setGmailSyncing(true);
    setGmailMsg(null);
    try {
      const n = await api.gmail.sync();
      setGmailMsg({ type: "ok", text: n > 0 ? `同步完成，新增 ${n} 封信件` : "已是最新，無新信件" });
    } catch (e) {
      setGmailMsg({ type: "err", text: String(e) });
    } finally {
      setGmailSyncing(false);
    }
  }

  async function handleGmailDisconnect() {
    await api.gmail.disconnect();
    setGmailStatus({ connected: false, email: null });
    setGmailMsg(null);
  }

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

  async function handleExport() {
    setExporting(true);
    setExportMsg(null);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const savePath = await save({
        defaultPath: `pm-backup-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!savePath) return;
      await api.reports.export(savePath);
      setExportMsg(`已匯出至 ${savePath}`);
    } catch (e) {
      setExportMsg(String(e));
    } finally {
      setExporting(false);
    }
  }

  async function handleCheckUpdate() {
    setUpdateStatus("checking");
    setUpdateVersion(null);
    setUpdateNotes(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update?.available) {
        setUpdateVersion(update.version);
        setUpdateNotes(update.body ?? null);
        setUpdateStatus("available");
      } else {
        setUpdateStatus("up-to-date");
        setTimeout(() => setUpdateStatus("idle"), 3000);
      }
    } catch (e) {
      setUpdateStatus("error");
      setUpdateNotes(String(e));
      setTimeout(() => { setUpdateStatus("idle"); setUpdateNotes(null); }, 6000);
    }
  }

  async function handleInstallUpdate() {
    setUpdateStatus("downloading");
    setDownloadPct(0);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      const update = await check();
      if (!update?.available) return;
      let downloaded = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setDownloadPct(Math.round((downloaded / total) * 100));
        }
      });
      await relaunch();
    } catch {
      setUpdateStatus("error");
      setTimeout(() => setUpdateStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-5 gap-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary">{t("settings.title")}</h1>

      {/* Gmail Integration */}
      <section className="glass-card p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary">Gmail 整合</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Client ID</Label>
            <Input
              value={form.gmail_client_id}
              onChange={(e) => set("gmail_client_id", e.target.value)}
              placeholder="123456789-abc....apps.googleusercontent.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={form.gmail_client_secret}
              onChange={(e) => set("gmail_client_secret", e.target.value)}
              placeholder="GOCSPX-..."
            />
          </div>
        </div>
        <p className="text-xs text-text-muted -mt-2">
          前往 <span className="text-primary">console.cloud.google.com</span> → API 和服務 → 憑證 → 建立 OAuth 2.0 用戶端 ID（類型選「桌面應用程式」）
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {gmailStatus?.connected ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                已連接：{gmailStatus.email}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3 text-xs gap-1.5"
                onClick={handleGmailSync}
                disabled={gmailSyncing}
              >
                {gmailSyncing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />同步中...</>
                  : <><Mail className="w-3.5 h-3.5" />立即同步</>}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-xs gap-1.5 text-danger hover:text-danger"
                onClick={handleGmailDisconnect}
              >
                <Unlink className="w-3.5 h-3.5" />中斷連接
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={handleGmailConnect}
              disabled={gmailLoading || !form.gmail_client_id || !form.gmail_client_secret}
            >
              {gmailLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />授權中...</>
                : <><Mail className="w-3.5 h-3.5" />連接 Gmail</>}
            </Button>
          )}
        </div>

        {gmailMsg && (
          <p className={`text-xs flex items-center gap-1 ${gmailMsg.type === "ok" ? "text-success" : "text-danger"}`}>
            {gmailMsg.type === "ok"
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <XCircle className="w-3.5 h-3.5" />}
            {gmailMsg.text}
          </p>
        )}

        <p className="text-xs text-text-muted">連接後每 5 分鐘自動同步收件匣，也可手動觸發</p>
      </section>

      {/* Email filtering */}
      <section className="glass-card p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary">信件過濾</h2>

        <div className="flex flex-col gap-1.5">
          <Label>我的 Email（寄出去的信不顯示）</Label>
          <Input
            value={form.my_email}
            onChange={(e) => set("my_email", e.target.value)}
            placeholder="your@email.com"
          />
          <p className="text-xs text-text-muted">填入後，n8n 推送進來的信件中若寄件者為此 Email 會自動忽略</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>封鎖 Domain（每行一個）</Label>
          <textarea
            value={form.email_blacklist_domains}
            onChange={(e) => set("email_blacklist_domains", e.target.value)}
            placeholder={"spam.com\nnewsletter.net\nads.example.com"}
            rows={4}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-xs text-text-muted">來自這些 domain 的信件會被丟棄，不進資料庫</p>
        </div>
      </section>

      {/* AI */}
      <section className="glass-card p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-primary">AI 功能</h2>
        <div className="flex flex-col gap-1.5">
          <Label>AI 服務商</Label>
          <Select
            value={form.ai_provider}
            onValueChange={(v) => set("ai_provider", v as AppSettings["ai_provider"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Google Gemini（免費）</SelectItem>
              <SelectItem value="openai">OpenAI GPT-4o mini</SelectItem>
              <SelectItem value="claude">Anthropic Claude Haiku</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>API Key</Label>
          <Input
            type="password"
            value={form.ai_api_key}
            onChange={(e) => set("ai_api_key", e.target.value)}
            placeholder={
              form.ai_provider === "gemini" ? "AIza..." :
              form.ai_provider === "openai" ? "sk-..." :
              "sk-ant-api03-..."
            }
          />
          <p className="text-xs text-text-muted">
            {form.ai_provider === "gemini" && <>前往 <span className="text-primary">aistudio.google.com/apikey</span> 免費取得</>}
            {form.ai_provider === "openai" && <>前往 <span className="text-primary">platform.openai.com/api-keys</span> 取得</>}
            {form.ai_provider === "claude" && <>前往 <span className="text-primary">console.anthropic.com</span> 取得</>}
          </p>
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
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-text-secondary text-sm">使用本機 Outlook 寄信</Label>
            <p className="text-xs text-text-muted mt-0.5">分派任務時透過 PowerShell 呼叫本機 Outlook 自動寄出通知（僅限 Windows）</p>
          </div>
          <Switch
            checked={form.use_outlook}
            onCheckedChange={(v) => set("use_outlook", v)}
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

      {/* Export */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{t("reports.export")}</h2>
        <p className="text-xs text-text-muted">
          {t("reports.exportPath").replace("：", "")} — {t("reports.exportSuccess").toLowerCase()}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? t("reports.exporting") : t("reports.export")}
          </Button>
          {exportMsg && (
            <p className="text-xs text-success truncate max-w-xs">{exportMsg}</p>
          )}
        </div>
      </section>

      {/* About & Updates */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{t("settings.about.title")}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">PM System — Tauri 2.0 + React + TypeScript</p>
            <p className="text-xs text-text-muted mt-0.5">{t("settings.about.version")}: {currentVersion}</p>
          </div>
          <div className="flex items-center gap-2">
            {updateStatus === "available" && (
              <Button
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={handleInstallUpdate}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                安裝 {updateVersion}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={handleCheckUpdate}
              disabled={updateStatus === "checking" || updateStatus === "downloading"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === "checking" ? "animate-spin" : ""}`} />
              {updateStatus === "checking" ? "檢查中..." : "檢查更新"}
            </Button>
          </div>
        </div>

        {/* Update status feedback */}
        {updateStatus === "up-to-date" && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已是最新版本
          </p>
        )}
        {updateStatus === "available" && updateVersion && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 flex flex-col gap-1">
            <p className="text-xs font-medium text-primary">發現新版本 {updateVersion}</p>
            {updateNotes && (
              <p className="text-[11px] text-text-muted whitespace-pre-wrap">{updateNotes}</p>
            )}
          </div>
        )}
        {updateStatus === "downloading" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>下載中...</span>
              <span>{downloadPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-layer-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200"
                style={{ width: `${downloadPct}%` }}
              />
            </div>
          </div>
        )}
        {updateStatus === "error" && (
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-xs text-danger">
              <XCircle className="w-3.5 h-3.5" /> 檢查失敗，請確認網路連線
            </p>
            {updateNotes && (
              <p className="text-[11px] text-text-muted font-mono break-all">{updateNotes}</p>
            )}
          </div>
        )}
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
