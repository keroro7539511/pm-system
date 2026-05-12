use crate::commands::settings_commands::load_settings_sync;
use crate::db::{gmail_tokens, DbPool};
use tauri::AppHandle;

pub async fn sync_emails(app: &AppHandle, pool: &DbPool) -> Result<usize, String> {
    let settings = load_settings_sync(app);

    let mut token = gmail_tokens::get(pool)
        .map_err(|e| e.to_string())?
        .ok_or("Gmail 尚未授權，請先在設定頁連接 Gmail")?;

    // Refresh access token if expiring within 60 seconds
    let now = chrono::Utc::now().timestamp();
    if token.expires_at <= now + 60 {
        let refresh_token = token
            .refresh_token
            .as_deref()
            .ok_or("缺少 refresh token，請重新授權")?;
        let refreshed = super::oauth::refresh_access_token(
            &settings.gmail_client_id,
            &settings.gmail_client_secret,
            refresh_token,
        )
        .await?;
        token.access_token = refreshed.access_token;
        token.expires_at = now + refreshed.expires_in;
        gmail_tokens::save(pool, &token).map_err(|e| e.to_string())?;
    }

    let access_token = &token.access_token;
    let refs = super::api::list_message_ids(access_token, 50).await?;

    let my_email = settings.my_email.to_lowercase();
    let blacklist: Vec<String> = settings
        .email_blacklist_domains
        .split(['\n', ','])
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty())
        .collect();

    let mut inserted = 0;

    for msg_ref in &refs {
        // Skip if already in DB
        let exists = {
            let conn = pool.get().map_err(|e| e.to_string())?;
            conn.query_row(
                "SELECT COUNT(*) FROM emails WHERE gmail_id = ?1",
                rusqlite::params![msg_ref.id],
                |r| r.get::<_, i64>(0),
            )
            .unwrap_or(0)
                > 0
        };
        if exists {
            continue;
        }

        let parsed = match super::api::get_message(access_token, &msg_ref.id).await {
            Ok(m) => m,
            Err(e) => {
                eprintln!("[gmail] get_message {} error: {e}", msg_ref.id);
                continue;
            }
        };

        // Filter: skip own emails
        let sender_addr = extract_email_addr(&parsed.sender).to_lowercase();
        if !my_email.is_empty() && sender_addr == my_email {
            continue;
        }

        // Filter: blacklisted domains
        let domain = extract_domain_from_addr(&sender_addr);
        if blacklist.iter().any(|d| *d == domain) {
            continue;
        }

        // Auto-classify by domain → match client
        let client_id = if domain.is_empty() {
            None
        } else {
            crate::db::clients::find_by_domain(pool, &domain)
                .ok()
                .flatten()
        };

        let incoming = crate::db::emails::IncomingEmail {
            gmail_id: Some(parsed.gmail_id),
            subject: parsed.subject,
            sender: parsed.sender,
            body: Some(parsed.body),
            ai_summary: None,
            category: None,
            client_id,
            received_at: Some(parsed.received_at),
            attachments: None,
        };

        match crate::db::emails::insert(pool, incoming) {
            Ok(_) => inserted += 1,
            Err(e) => eprintln!("[gmail] insert error: {e}"),
        }
    }

    if inserted > 0 {
        eprintln!("[gmail] synced {inserted} new email(s)");
    }

    Ok(inserted)
}

fn extract_email_addr(sender: &str) -> String {
    if let (Some(s), Some(e)) = (sender.find('<'), sender.find('>')) {
        sender[s + 1..e].trim().to_string()
    } else {
        sender.trim().to_string()
    }
}

fn extract_domain_from_addr(email: &str) -> String {
    email
        .split('@')
        .nth(1)
        .unwrap_or("")
        .trim()
        .to_lowercase()
}
