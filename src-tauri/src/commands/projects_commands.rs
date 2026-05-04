use tauri::State;

use crate::db::{projects, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_projects(pool: State<'_, DbPool>) -> CmdResult<Vec<projects::Project>> {
    projects::get_all(&pool).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_project(
    pool: State<'_, DbPool>,
    payload: projects::CreateProjectPayload,
) -> CmdResult<projects::Project> {
    projects::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_project(
    pool: State<'_, DbPool>,
    id: i64,
    payload: projects::UpdateProjectPayload,
) -> CmdResult<projects::Project> {
    projects::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_project(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    projects::delete(&pool, id).map_err(|e| e.to_string())
}
