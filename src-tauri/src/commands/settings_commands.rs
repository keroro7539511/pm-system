use serde::{Deserialize, Serialize};
use tauri::Manager;

type CmdResult<T> = Result<T, String>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub n8n_webhook_url: String,
    pub n8n_local_port: u16,
    pub n8n_hmac_secret: String,
    pub notifications_enabled: bool,
    pub theme: String,
    pub language: String,
    pub auto_backup: bool,
    #[serde(default)]
    pub ai_api_key: String,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(default)]
    pub task_assign_webhook_url: String,
    #[serde(default)]
    pub my_email: String,
    #[serde(default)]
    pub email_blacklist_domains: String, // 換行分隔，例："spam.com\nads.net"
    #[serde(default)]
    pub use_outlook: bool,
}

fn default_ai_provider() -> String {
    "gemini".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            n8n_webhook_url: String::new(),
            n8n_local_port: 54321,
            n8n_hmac_secret: String::new(),
            notifications_enabled: true,
            theme: "dark".to_string(),
            language: "zh-TW".to_string(),
            auto_backup: false,
            ai_api_key: String::new(),
            ai_provider: "gemini".to_string(),
            task_assign_webhook_url: String::new(),
            my_email: String::new(),
            email_blacklist_domains: String::new(),
            use_outlook: false,
        }
    }
}

pub fn load_settings_sync(app: &tauri::AppHandle) -> AppSettings {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(_) => return AppSettings::default(),
    };
    if !path.exists() {
        return AppSettings::default();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|d| d.join("config.json"))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> CmdResult<AppSettings> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> CmdResult<()> {
    let path = config_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_n8n_connection(url: String) -> CmdResult<bool> {
    if url.is_empty() {
        return Err("URL 不可為空".to_string());
    }
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Use POST with a ping payload — n8n webhooks only respond to POST,
    // and return 404 when inactive. A real 200 means the workflow is active.
    let resp = client
        .post(&url)
        .json(&serde_json::json!({ "event": "ping" }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(resp.status().is_success())
}
