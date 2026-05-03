export * from "./task";
export * from "./project";
export * from "./client";
export * from "./email";

export interface AppSettings {
  n8n_webhook_url: string;
  n8n_local_port: number;
  n8n_hmac_secret: string;
  notifications_enabled: boolean;
  theme: "dark" | "light" | "system";
  language: "zh-TW" | "en";
  auto_backup: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  n8n_webhook_url: "",
  n8n_local_port: 54321,
  n8n_hmac_secret: "",
  notifications_enabled: true,
  theme: "dark",
  language: "zh-TW",
  auto_backup: false,
};
