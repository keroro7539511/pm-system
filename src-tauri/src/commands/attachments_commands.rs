use tauri::State;

use crate::db::{attachments::EmailAttachment, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_email_attachments(pool: State<'_, DbPool>, email_id: i64) -> CmdResult<Vec<EmailAttachment>> {
    crate::db::attachments::get_for_email(&pool, email_id).map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(deprecated)]
pub async fn open_attachment(app: tauri::AppHandle, path: String) -> CmdResult<()> {
    use tauri_plugin_shell::ShellExt;
    app.shell().open(&path, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_attachment_base64(app: tauri::AppHandle, path: String) -> CmdResult<String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use tauri::Manager;

    let allowed_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("attachments");

    let canonical = std::fs::canonicalize(&path).map_err(|e| e.to_string())?;
    if !canonical.starts_with(&allowed_dir) {
        return Err("拒絕存取：路徑超出允許範圍".to_string());
    }

    let bytes = std::fs::read(&canonical).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(&bytes))
}
