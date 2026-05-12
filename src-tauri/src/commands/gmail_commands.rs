use serde::Serialize;
use tauri::State;

use crate::commands::settings_commands::load_settings_sync;
use crate::db::{gmail_tokens, DbPool};

type CmdResult<T> = Result<T, String>;

#[derive(Serialize)]
pub struct GmailStatus {
    pub connected: bool,
    pub email: Option<String>,
}

#[tauri::command]
pub async fn gmail_start_auth(
    app: tauri::AppHandle,
    pool: State<'_, DbPool>,
) -> CmdResult<GmailStatus> {
    let settings = load_settings_sync(&app);
    if settings.gmail_client_id.is_empty() || settings.gmail_client_secret.is_empty() {
        return Err("請先填入 Gmail Client ID 和 Client Secret 並儲存設定".to_string());
    }

    let token_resp = crate::gmail::oauth::start_oauth_flow(
        &settings.gmail_client_id,
        &settings.gmail_client_secret,
    )
    .await?;

    let expires_at = chrono::Utc::now().timestamp() + token_resp.expires_in;
    let email = crate::gmail::api::get_profile_email(&token_resp.access_token)
        .await
        .ok();

    let token = gmail_tokens::GmailToken {
        access_token: token_resp.access_token,
        refresh_token: token_resp.refresh_token,
        expires_at,
        email: email.clone(),
    };
    gmail_tokens::save(&pool, &token).map_err(|e| e.to_string())?;

    Ok(GmailStatus { connected: true, email })
}

#[tauri::command]
pub async fn gmail_get_status(pool: State<'_, DbPool>) -> CmdResult<GmailStatus> {
    let token = gmail_tokens::get(&pool).map_err(|e| e.to_string())?;
    Ok(match token {
        Some(t) => GmailStatus { connected: true, email: t.email },
        None => GmailStatus { connected: false, email: None },
    })
}

#[tauri::command]
pub async fn gmail_sync(
    app: tauri::AppHandle,
    pool: State<'_, DbPool>,
) -> CmdResult<usize> {
    crate::gmail::sync::sync_emails(&app, &pool).await
}

#[tauri::command]
pub async fn gmail_disconnect(pool: State<'_, DbPool>) -> CmdResult<()> {
    gmail_tokens::delete(&pool).map_err(|e| e.to_string())
}
