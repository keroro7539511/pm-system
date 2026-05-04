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
use crate::db::{attachments, clients, emails, DbPool};

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

    // Stash attachments before moving `incoming` into insert()
    let incoming_attachments = incoming.attachments.clone().unwrap_or_default();

    match emails::insert(&state.pool, incoming) {
        Ok(email) => {
            // Resolve & persist attachments
            if !incoming_attachments.is_empty() {
                let att_base = state.app
                    .path()
                    .app_data_dir()
                    .map(|d| d.join("attachments").join(email.id.to_string()))
                    .ok();

                for att in &incoming_attachments {
                    let resolved_path: Option<String> = if let Some(b64) = &att.data {
                        // Rust decodes base64 and writes the file
                        att_base.as_ref().and_then(|base| {
                            std::fs::create_dir_all(base).ok()?;
                            let path = base.join(&att.filename);
                            use std::io::Write;
                            let bytes = decode_base64(b64).ok()?;
                            std::fs::File::create(&path).ok()?.write_all(&bytes).ok()?;
                            path.to_str().map(|s| s.to_string())
                        })
                    } else {
                        att.file_path.clone()
                    };

                    if let Some(path) = resolved_path {
                        let size = att.size.or_else(|| {
                            std::fs::metadata(&path).ok().map(|m| m.len() as i64)
                        });
                        if let Err(e) = attachments::insert_resolved(
                            &state.pool,
                            email.id,
                            &att.filename,
                            &path,
                            att.mime_type.as_deref(),
                            size,
                        ) {
                            eprintln!("[webhook] attachment insert error: {e}");
                        }
                    }
                }
            }

            let _ = state.app.emit("email:received", &email);
            StatusCode::OK
        }
        Err(e) => {
            eprintln!("[webhook] email insert error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

fn decode_base64(s: &str) -> Result<Vec<u8>, String> {
    use std::io::Read;
    // Remove any whitespace/newlines n8n might add
    let clean: String = s.chars().filter(|c| !c.is_ascii_whitespace()).collect();
    // Try standard then URL-safe alphabet
    let engine_std = base64::engine::GeneralPurpose::new(
        &base64::alphabet::STANDARD,
        base64::engine::general_purpose::PAD,
    );
    let engine_url = base64::engine::GeneralPurpose::new(
        &base64::alphabet::URL_SAFE,
        base64::engine::general_purpose::PAD,
    );
    use base64::Engine;
    engine_std.decode(&clean)
        .or_else(|_| engine_url.decode(&clean))
        .map_err(|e| e.to_string())
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
