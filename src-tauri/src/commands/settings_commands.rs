use serde::{Deserialize, Serialize};
use tauri::Manager;

type CmdResult<T> = Result<T, String>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub notifications_enabled: bool,
    pub theme: String,
    pub language: String,
    pub auto_backup: bool,
    #[serde(default)]
    pub ai_api_key: String,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(default)]
    pub my_email: String,
    #[serde(default)]
    pub email_blacklist_domains: String,
    #[serde(default)]
    pub use_outlook: bool,
    #[serde(default)]
    pub gmail_client_id: String,
    #[serde(default)]
    pub gmail_client_secret: String,
    #[serde(default)]
    pub launch_at_login: bool,
}

fn default_ai_provider() -> String {
    "gemini".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            notifications_enabled: true,
            theme: "dark".to_string(),
            language: "zh-TW".to_string(),
            auto_backup: false,
            ai_api_key: String::new(),
            ai_provider: "gemini".to_string(),
            my_email: String::new(),
            email_blacklist_domains: String::new(),
            use_outlook: false,
            gmail_client_id: String::new(),
            gmail_client_secret: String::new(),
            launch_at_login: false,
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
    std::fs::write(&path, data).map_err(|e| e.to_string())?;

    use tauri_plugin_autostart::ManagerExt;
    if settings.launch_at_login {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }

    Ok(())
}

