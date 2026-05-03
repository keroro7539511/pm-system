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

use crate::db::{emails, DbPool};

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

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tracing_or_print(format!("Webhook server listening on {addr}"));

    if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
        let _ = axum::serve(listener, router).await;
    } else {
        tracing_or_print(format!("Failed to bind webhook server on port {port}"));
    }
}

fn tracing_or_print(msg: String) {
    eprintln!("[webhook] {msg}");
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

// POST /webhook/email-received
// Body: { gmail_id, subject, sender, body, ai_summary, category, client_id, received_at }
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

    let Ok(incoming) = serde_json::from_slice::<emails::IncomingEmail>(&body) else {
        return StatusCode::BAD_REQUEST;
    };

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
