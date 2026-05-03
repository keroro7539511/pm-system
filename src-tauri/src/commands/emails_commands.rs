use tauri::State;

use crate::db::{emails, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_emails(
    pool: State<'_, DbPool>,
    client_id: Option<i64>,
    status: Option<String>,
) -> CmdResult<Vec<emails::Email>> {
    emails::get_all(&pool, client_id, status).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_email(
    pool: State<'_, DbPool>,
    id: i64,
    payload: emails::UpdateEmailPayload,
) -> CmdResult<emails::Email> {
    emails::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_email_read(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    emails::mark_read(&pool, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_unread_count(pool: State<'_, DbPool>) -> CmdResult<i64> {
    emails::unread_count(&pool).map_err(|e| e.to_string())
}
