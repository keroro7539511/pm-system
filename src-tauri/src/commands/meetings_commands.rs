use tauri::State;

use crate::db::{meetings, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_meetings(
    pool: State<'_, DbPool>,
    search: Option<String>,
) -> CmdResult<Vec<meetings::Meeting>> {
    meetings::get_all(&pool, search).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_meeting(
    pool: State<'_, DbPool>,
    payload: meetings::CreateMeetingPayload,
) -> CmdResult<meetings::Meeting> {
    meetings::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_meeting(
    pool: State<'_, DbPool>,
    id: i64,
    payload: meetings::UpdateMeetingPayload,
) -> CmdResult<meetings::Meeting> {
    meetings::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_meeting(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    meetings::delete(&pool, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_action_items(
    pool: State<'_, DbPool>,
    meeting_id: i64,
) -> CmdResult<Vec<meetings::ActionItem>> {
    meetings::get_action_items(&pool, meeting_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_action_items(
    pool: State<'_, DbPool>,
    meeting_id: i64,
    items: Vec<meetings::ActionItemInput>,
) -> CmdResult<Vec<meetings::ActionItem>> {
    meetings::save_action_items(&pool, meeting_id, items).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn link_action_item_task(
    pool: State<'_, DbPool>,
    action_item_id: i64,
    task_id: i64,
) -> CmdResult<()> {
    meetings::link_action_item_task(&pool, action_item_id, task_id).map_err(|e| e.to_string())
}
