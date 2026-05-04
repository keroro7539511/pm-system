use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::commands::settings_commands::load_settings_sync;
use crate::n8n::webhook_client;

type CmdResult<T> = Result<T, String>;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskAssignedPayload {
    pub task_id: i64,
    pub task_title: String,
    pub description: Option<String>,
    pub assignee: Option<String>,
    pub assignee_email: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub project_name: Option<String>,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
}

#[tauri::command]
pub async fn notify_task_assigned(
    app: tauri::AppHandle,
    payload: TaskAssignedPayload,
) -> CmdResult<bool> {
    let settings = load_settings_sync(&app);
    if settings.task_assign_webhook_url.is_empty() {
        return Ok(false); // URL 未設定，靜默跳過
    }

    let body = json!({
        "event":        "task_assigned",
        "task_id":      payload.task_id,
        "task_title":   payload.task_title,
        "description":  payload.description,
        "assignee":     payload.assignee,
        "assignee_email": payload.assignee_email,
        "priority":     payload.priority,
        "status":       payload.status,
        "project_name": payload.project_name,
        "start_date":   payload.start_date,
        "due_date":     payload.due_date,
    });

    webhook_client::trigger(&settings.task_assign_webhook_url, body)
        .await
        .map_err(|e| format!("任務指派通知失敗：{e}"))?;

    Ok(true) // 成功送出
}
