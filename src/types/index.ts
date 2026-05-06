export * from "./task";
export * from "./project";
export * from "./client";
export * from "./contact";
export * from "./employee";
export * from "./email";
export * from "./document";
export * from "./goal";

export interface AppSettings {
  n8n_webhook_url: string;
  n8n_local_port: number;
  n8n_hmac_secret: string;
  notifications_enabled: boolean;
  theme: "dark" | "light" | "system";
  language: "zh-TW" | "en";
  auto_backup: boolean;
  ai_provider: "gemini" | "openai" | "claude";
  ai_api_key: string;
  task_assign_webhook_url: string;
  my_email: string;
  email_blacklist_domains: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  n8n_webhook_url: "",
  n8n_local_port: 54321,
  n8n_hmac_secret: "",
  notifications_enabled: true,
  theme: "dark",
  language: "zh-TW",
  auto_backup: false,
  ai_provider: "gemini",
  ai_api_key: "",
  task_assign_webhook_url: "",
  my_email: "",
  email_blacklist_domains: "",
};
