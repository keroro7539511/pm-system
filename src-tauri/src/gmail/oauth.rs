use axum::{extract::Query, response::Html, routing::get, Router};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::sync::oneshot;

#[derive(Deserialize)]
struct CallbackParams {
    code: Option<String>,
    error: Option<String>,
}

pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
}

fn generate_code_verifier() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let pid = std::process::id() as u128;
    // Hash with SHA256 to get uniform distribution
    let mut h = Sha256::new();
    h.update(nanos.to_le_bytes());
    h.update(pid.to_le_bytes());
    let hash = h.finalize();
    URL_SAFE_NO_PAD.encode(hash)
}

fn generate_code_challenge(verifier: &str) -> String {
    let mut h = Sha256::new();
    h.update(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(h.finalize())
}

fn percent_encode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

pub async fn start_oauth_flow(
    client_id: &str,
    client_secret: &str,
) -> Result<TokenResponse, String> {
    let code_verifier = generate_code_verifier();
    let code_challenge = generate_code_challenge(&code_verifier);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("無法綁定本機埠: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    // Google Desktop app OAuth only accepts bare loopback URIs (no path)
    let redirect_uri = format!("http://127.0.0.1:{port}");

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
        ?client_id={}\
        &redirect_uri={}\
        &response_type=code\
        &scope={}\
        &code_challenge={}\
        &code_challenge_method=S256\
        &access_type=offline\
        &prompt=consent",
        percent_encode(client_id),
        percent_encode(&redirect_uri),
        percent_encode("https://www.googleapis.com/auth/gmail.modify"),
        code_challenge,
    );

    let (tx, rx) = oneshot::channel::<Result<String, String>>();
    let tx = Arc::new(tokio::sync::Mutex::new(Some(tx)));
    let tx_clone = tx.clone();

    let router = Router::new().route(
        "/",
        get(move |Query(params): Query<CallbackParams>| {
            let tx = tx_clone.clone();
            async move {
                let mut guard = tx.lock().await;
                if let Some(sender) = guard.take() {
                    if let Some(err) = params.error {
                        let _ = sender.send(Err(err));
                        Html("<html><body style='font-family:sans-serif;padding:40px'><h2>❌ 授權失敗</h2><p>請關閉此視窗並重試。</p></body></html>".to_string())
                    } else if let Some(code) = params.code {
                        let _ = sender.send(Ok(code));
                        Html("<html><body style='font-family:sans-serif;padding:40px'><h2>✅ 授權成功！</h2><p>請返回 PM System。</p></body></html>".to_string())
                    } else {
                        let _ = sender.send(Err("未收到授權碼".to_string()));
                        Html("<html><body style='font-family:sans-serif;padding:40px'><h2>❌ 未收到授權碼</h2><p>請重試。</p></body></html>".to_string())
                    }
                } else {
                    Html("<html><body style='font-family:sans-serif;padding:40px'><p>已處理，請關閉此視窗。</p></body></html>".to_string())
                }
            }
        }),
    );

    let server_task = tokio::spawn(async move {
        let _ = axum::serve(listener, router).await;
    });

    open_browser(&auth_url)?;

    let code = tokio::time::timeout(std::time::Duration::from_secs(300), rx)
        .await
        .map_err(|_| "OAuth 授權逾時（5 分鐘），請重試".to_string())?
        .map_err(|_| "內部錯誤：channel 關閉".to_string())?
        .map_err(|e| format!("OAuth 錯誤：{e}"))?;

    server_task.abort();

    exchange_code(client_id, client_secret, &code, &redirect_uri, &code_verifier).await
}

async fn exchange_code(
    client_id: &str,
    client_secret: &str,
    code: &str,
    redirect_uri: &str,
    code_verifier: &str,
) -> Result<TokenResponse, String> {
    #[derive(Deserialize)]
    struct Resp {
        access_token: Option<String>,
        refresh_token: Option<String>,
        expires_in: Option<i64>,
        error: Option<String>,
        error_description: Option<String>,
    }

    let http = reqwest::Client::new();
    let resp: Resp = http
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", code_verifier),
        ])
        .send()
        .await
        .map_err(|e| format!("Token 交換請求失敗: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Token 回應解析失敗: {e}"))?;

    if let Some(err) = resp.error {
        let desc = resp.error_description.unwrap_or_default();
        return Err(format!("Token 交換失敗: {err} — {desc}"));
    }

    Ok(TokenResponse {
        access_token: resp.access_token.ok_or("Missing access_token")?,
        refresh_token: resp.refresh_token,
        expires_in: resp.expires_in.unwrap_or(3600),
    })
}

pub async fn refresh_access_token(
    client_id: &str,
    client_secret: &str,
    refresh_token: &str,
) -> Result<TokenResponse, String> {
    #[derive(Deserialize)]
    struct Resp {
        access_token: Option<String>,
        expires_in: Option<i64>,
        error: Option<String>,
    }

    let http = reqwest::Client::new();
    let resp: Resp = http
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id),
            ("client_secret", client_secret),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token 刷新失敗: {e}"))?
        .json()
        .await
        .map_err(|e| format!("Token 刷新解析失敗: {e}"))?;

    if let Some(err) = resp.error {
        return Err(format!("Token 刷新失敗: {err}"));
    }

    Ok(TokenResponse {
        access_token: resp.access_token.ok_or("Missing access_token")?,
        refresh_token: Some(refresh_token.to_string()),
        expires_in: resp.expires_in.unwrap_or(3600),
    })
}

fn open_browser(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| format!("無法開啟瀏覽器: {e}"))?;

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn()
        .map_err(|e| format!("無法開啟瀏覽器: {e}"))?;

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    std::process::Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map_err(|e| format!("無法開啟瀏覽器: {e}"))?;

    Ok(())
}
