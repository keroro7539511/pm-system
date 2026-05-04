use tauri::State;

use crate::db::{attachments::EmailAttachment, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_email_attachments(pool: State<'_, DbPool>, email_id: i64) -> CmdResult<Vec<EmailAttachment>> {
    crate::db::attachments::get_for_email(&pool, email_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_attachment(app: tauri::AppHandle, path: String) -> CmdResult<()> {
    use tauri_plugin_shell::ShellExt;
    app.shell().open(&path, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_attachment_base64(path: String) -> CmdResult<String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(&bytes))
}
