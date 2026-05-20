use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::settings_commands::load_settings_sync;
use crate::db::{gmail_tokens, DbPool};

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
    pool: State<'_, DbPool>,
    payload: TaskAssignedPayload,
) -> CmdResult<bool> {
    let to = match &payload.assignee_email {
        Some(e) if !e.is_empty() => e.clone(),
        _ => return Ok(false),
    };

    let mut token = match gmail_tokens::get(&pool)
        .map_err(|e| e.to_string())?
        .filter(|t| !t.access_token.is_empty())
    {
        Some(t) => t,
        None => return Ok(false),
    };

    let settings = load_settings_sync(&app);
    let now = chrono::Utc::now().timestamp();
    if token.expires_at <= now + 60 {
        let refresh_token = token
            .refresh_token
            .as_deref()
            .ok_or("缺少 refresh token，請重新授權")?;
        let refreshed = crate::gmail::oauth::refresh_access_token(
            &settings.gmail_client_id,
            &settings.gmail_client_secret,
            refresh_token,
        )
        .await?;
        token.access_token = refreshed.access_token;
        token.expires_at = now + refreshed.expires_in;
        gmail_tokens::save(&pool, &token).map_err(|e| e.to_string())?;
    }

    let subject = format!("【任務指派】{}", payload.task_title);
    let body = build_email_body(&payload);

    crate::gmail::api::send_email(&token.access_token, &to, &subject, &body).await?;
    Ok(true)
}

fn build_email_body(p: &TaskAssignedPayload) -> String {
    let mut lines = vec![
        format!("任務名稱：{}", p.task_title),
        format!("指派對象：{}", p.assignee.as_deref().unwrap_or("-")),
    ];
    if let Some(desc) = &p.description {
        lines.push(format!("說明：{desc}"));
    }
    if let Some(prio) = &p.priority {
        lines.push(format!("優先度：{prio}"));
    }
    if let Some(proj) = &p.project_name {
        lines.push(format!("專案：{proj}"));
    }
    if let Some(due) = &p.due_date {
        lines.push(format!("截止日：{due}"));
    }
    lines.join("\n")
}
