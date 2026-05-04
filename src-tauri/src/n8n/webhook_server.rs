use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::post,
    Router,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

use crate::commands::settings_commands::load_settings_sync;
use crate::db::{clients, emails, DbPool};

#[derive(Clone)]
struct AppState {
    app: AppHandle,
    pool: DbPool,
    hmac_secret: Arc<tokio::sync::RwLock<String>>,
}

pub async fn start(app: AppHandle, port: u16, secret: String) {
    let pool = app.state::<DbPool>().inner().clone();
    let state = AppState {
        app,
        pool,
        hmac_secret: Arc::new(tokio::sync::RwLock::new(secret)),
    };

    let router = Router::new()
        .route("/webhook/email-received", post(handle_email))
        .route("/webhook/calendar-event", post(handle_calendar))
        .route("/webhook/meeting-transcript", post(handle_meeting))
        .route("/webhook/weekly-report", post(handle_report))
        .with_state(state);

    // 0.0.0.0 allows Docker containers to reach this server via host.docker.internal
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    eprintln!("[webhook] Webhook server listening on {addr}");

    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        let _ = axum::serve(listener, router).await;
    } else {
        eprintln!("[webhook] Failed to bind webhook server on port {port}");
    }
}

fn verify_hmac(secret: &str, body: &[u8], header_sig: Option<&str>) -> bool {
    if secret.is_empty() {
        return true; // HMAC not configured, skip verification
    }
    let Some(sig) = header_sig else { return false };
    let sig = sig.strip_prefix("sha256=").unwrap_or(sig);
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .expect("HMAC accepts any key size");
    mac.update(body);
    let result = hex::encode(mac.finalize().into_bytes());
    result == sig
}

/// "Display Name <user@example.com>" → "user@example.com"
/// "user@example.com" → "user@example.com"
fn extract_email_address(sender: &str) -> String {
    if let (Some(s), Some(e)) = (sender.find('<'), sender.find('>')) {
        if s < e {
            return sender[s + 1..e].trim().to_lowercase();
        }
    }
    sender.trim().to_lowercase()
}

/// "user@example.com" → "example.com"
fn extract_domain(sender: &str) -> Option<String> {
    let addr = extract_email_address(sender);
    addr.split('@').nth(1).map(|d| d.to_lowercase())
}

// POST /webhook/email-received
async fn handle_email(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> StatusCode {
    let secret = state.hmac_secret.read().await;
    let sig = headers.get("x-webhook-secret").and_then(|v| v.to_str().ok());
    if !verify_hmac(&secret, &body, sig) {
        return StatusCode::UNAUTHORIZED;
    }
    drop(secret);

    let Ok(mut incoming) = serde_json::from_slice::<emails::IncomingEmail>(&body) else {
        return StatusCode::BAD_REQUEST;
    };

    let settings = load_settings_sync(&state.app);

    // 過濾：跳過自己寄出的信
    if !settings.my_email.is_empty() {
        let sender_addr = extract_email_address(&incoming.sender);
        if sender_addr == settings.my_email.trim().to_lowercase() {
            return StatusCode::OK;
        }
    }

    // 過濾：封鎖黑名單 domain
    if let Some(sender_domain) = extract_domain(&incoming.sender) {
        let blocked = settings
            .email_blacklist_domains
            .split(['\n', ','])
            .map(str::trim)
            .filter(|d| !d.is_empty())
            .any(|d| d.to_lowercase() == sender_domain);

        if blocked {
            eprintln!("[webhook] blocked email from domain: {sender_domain}");
            return StatusCode::OK;
        }

        // 依 domain 自動歸類到客戶（僅當 payload 未指定 client_id 時）
        if incoming.client_id.is_none() {
            match clients::find_by_domain(&state.pool, &sender_domain) {
                Ok(Some(cid)) => {
                    incoming.client_id = Some(cid);
                }
                Ok(None) => {
                    // 找不到 → 自動建立新客戶分類
                    let new_client_payload = clients::CreateClientPayload {
                        name: sender_domain.clone(),
                        contact_person: None,
                        email: None,
                        phone: None,
                        industry: None,
                        priority: Some(3),
                        notes: None,
                        domain: Some(sender_domain.clone()),
                    };
                    match clients::create(&state.pool, new_client_payload) {
                        Ok(new_client) => {
                            incoming.client_id = Some(new_client.id);
                            let _ = state.app.emit("client:created", &new_client);
                        }
                        Err(e) => {
                            eprintln!("[webhook] auto-create client failed: {e}");
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[webhook] find_by_domain error: {e}");
                }
            }
        }
    }

    match emails::insert(&state.pool, incoming) {
        Ok(email) => {
            let _ = state.app.emit("email:received", &email);
            StatusCode::OK
        }
        Err(e) => {
            eprintln!("[webhook] email insert error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// POST /webhook/calendar-event
async fn handle_calendar(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> StatusCode {
    let secret = state.hmac_secret.read().await;
    let sig = headers.get("x-webhook-secret").and_then(|v| v.to_str().ok());
    if !verify_hmac(&secret, &body, sig) {
        return StatusCode::UNAUTHORIZED;
    }
    drop(secret);

    if let Ok(payload) = serde_json::from_slice::<serde_json::Value>(&body) {
        let _ = state.app.emit("calendar:event", &payload);
    }
    StatusCode::OK
}

// POST /webhook/meeting-transcript
async fn handle_meeting(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> StatusCode {
    let secret = state.hmac_secret.read().await;
    let sig = headers.get("x-webhook-secret").and_then(|v| v.to_str().ok());
    if !verify_hmac(&secret, &body, sig) {
        return StatusCode::UNAUTHORIZED;
    }
    drop(secret);

    if let Ok(payload) = serde_json::from_slice::<serde_json::Value>(&body) {
        let _ = state.app.emit("meeting:transcript", &payload);
    }
    StatusCode::OK
}

// POST /webhook/weekly-report
async fn handle_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> StatusCode {
    let secret = state.hmac_secret.read().await;
    let sig = headers.get("x-webhook-secret").and_then(|v| v.to_str().ok());
    if !verify_hmac(&secret, &body, sig) {
        return StatusCode::UNAUTHORIZED;
    }
    drop(secret);

    if let Ok(payload) = serde_json::from_slice::<serde_json::Value>(&body) {
        let _ = state.app.emit("report:weekly", &payload);
    }
    StatusCode::OK
}
