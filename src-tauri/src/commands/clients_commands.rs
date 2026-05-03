use tauri::State;

use crate::db::{clients, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_clients(pool: State<'_, DbPool>) -> CmdResult<Vec<clients::Client>> {
    clients::get_all(&pool).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_client(
    pool: State<'_, DbPool>,
    payload: clients::CreateClientPayload,
) -> CmdResult<clients::Client> {
    clients::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_client(
    pool: State<'_, DbPool>,
    id: i64,
    payload: clients::UpdateClientPayload,
) -> CmdResult<clients::Client> {
    clients::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_client(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    clients::delete(&pool, id).map_err(|e| e.to_string())
}
