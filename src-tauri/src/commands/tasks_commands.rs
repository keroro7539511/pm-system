use tauri::State;

use crate::db::{tasks, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_tasks(
    pool: State<'_, DbPool>,
    status: Option<String>,
) -> CmdResult<Vec<tasks::Task>> {
    tasks::get_all(&pool, status).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_task(
    pool: State<'_, DbPool>,
    payload: tasks::CreateTaskPayload,
) -> CmdResult<tasks::Task> {
    tasks::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task(
    pool: State<'_, DbPool>,
    id: i64,
    payload: tasks::UpdateTaskPayload,
) -> CmdResult<tasks::Task> {
    tasks::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_task(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    tasks::delete(&pool, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_stats(pool: State<'_, DbPool>) -> CmdResult<tasks::TaskStats> {
    tasks::stats(&pool).map_err(|e| e.to_string())
}
