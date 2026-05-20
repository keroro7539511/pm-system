export * from "./task";
export * from "./project";
export * from "./client";
export * from "./contact";
export * from "./employee";
export * from "./email";
export * from "./document";
export * from "./goal";

export interface AppSettings {
  notifications_enabled: boolean;
  theme: "dark" | "light" | "system";
  language: "zh-TW" | "en";
  auto_backup: boolean;
  ai_provider: "gemini" | "openai" | "claude";
  ai_api_key: string;
  my_email: string;
  email_blacklist_domains: string;
  use_outlook: boolean;
  gmail_client_id: string;
  gmail_client_secret: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifications_enabled: true,
  theme: "dark",
  language: "zh-TW",
  auto_backup: false,
  ai_provider: "gemini",
  ai_api_key: "",
  my_email: "",
  email_blacklist_domains: "",
  use_outlook: false,
  gmail_client_id: "",
  gmail_client_secret: "",
};
