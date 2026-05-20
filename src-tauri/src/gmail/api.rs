use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};

const API_BASE: &str = "https://gmail.googleapis.com/gmail/v1";

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageRef {
    pub id: String,
}

#[derive(Debug, Deserialize)]
struct MessageListResponse {
    pub messages: Option<Vec<MessageRef>>,
}

#[derive(Debug, Deserialize)]
struct Message {
    pub id: String,
    pub payload: Option<MessagePart>,
    #[serde(rename = "internalDate")]
    pub internal_date: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MessagePart {
    pub headers: Option<Vec<Header>>,
    pub body: Option<MessageBody>,
    pub parts: Option<Vec<MessagePart>>,
    #[serde(rename = "mimeType")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Header {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
struct MessageBody {
    pub data: Option<String>,
}

pub struct ParsedMessage {
    pub gmail_id: String,
    pub subject: String,
    pub sender: String,
    pub body: String,
    pub received_at: String,
}

pub async fn list_message_ids(access_token: &str, max: u32) -> Result<Vec<MessageRef>, String> {
    let url = format!(
        "{API_BASE}/users/me/messages?labelIds=INBOX&maxResults={max}"
    );
    let resp: MessageListResponse = reqwest::Client::new()
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("list_messages 失敗: {e}"))?
        .json()
        .await
        .map_err(|e| format!("list_messages 解析失敗: {e}"))?;
    Ok(resp.messages.unwrap_or_default())
}

pub async fn get_message(access_token: &str, id: &str) -> Result<ParsedMessage, String> {
    let url = format!("{API_BASE}/users/me/messages/{id}?format=full");
    let msg: Message = reqwest::Client::new()
        .get(&url)
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("get_message 失敗: {e}"))?
        .json()
        .await
        .map_err(|e| format!("get_message 解析失敗: {e}"))?;
    parse_message(msg)
}

pub async fn get_profile_email(access_token: &str) -> Result<String, String> {
    #[derive(Deserialize)]
    struct Profile {
        #[serde(rename = "emailAddress")]
        email_address: String,
    }
    let profile: Profile = reqwest::Client::new()
        .get(format!("{API_BASE}/users/me/profile"))
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("get_profile 失敗: {e}"))?
        .json()
        .await
        .map_err(|e| format!("get_profile 解析失敗: {e}"))?;
    Ok(profile.email_address)
}

fn parse_message(msg: Message) -> Result<ParsedMessage, String> {
    let payload = msg.payload.as_ref().ok_or("Message has no payload")?;
    let headers = payload.headers.as_deref().unwrap_or(&[]);

    let subject = header_val(headers, "Subject").unwrap_or_else(|| "(無主旨)".into());
    let sender = header_val(headers, "From").unwrap_or_else(|| "未知寄件者".into());
    let date_str = header_val(headers, "Date").unwrap_or_default();

    let received_at = parse_rfc2822(&date_str).unwrap_or_else(|| {
        msg.internal_date
            .as_deref()
            .and_then(|s| s.parse::<i64>().ok())
            .and_then(|ms| chrono::DateTime::from_timestamp(ms / 1000, 0))
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string())
    });

    let body = extract_body(payload);

    Ok(ParsedMessage { gmail_id: msg.id, subject, sender, body, received_at })
}

fn header_val(headers: &[Header], name: &str) -> Option<String> {
    headers
        .iter()
        .find(|h| h.name.eq_ignore_ascii_case(name))
        .map(|h| h.value.clone())
}

fn extract_body(part: &MessagePart) -> String {
    find_mime(part, "text/plain")
        .or_else(|| find_mime(part, "text/html").map(|h| strip_html(&h)))
        .unwrap_or_default()
}

fn find_mime(part: &MessagePart, mime: &str) -> Option<String> {
    if part.mime_type.as_deref() == Some(mime) {
        if let Some(data) = part.body.as_ref().and_then(|b| b.data.as_deref()) {
            let clean: String = data.chars().filter(|c| !c.is_ascii_whitespace()).collect();
            if let Ok(bytes) = URL_SAFE_NO_PAD.decode(&clean) {
                return String::from_utf8(bytes).ok();
            }
        }
    }
    part.parts
        .as_deref()
        .unwrap_or(&[])
        .iter()
        .find_map(|p| find_mime(p, mime))
}

fn strip_html(html: &str) -> String {
    let mut out = String::new();
    let mut in_tag = false;
    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    let mut result = String::new();
    let mut prev_nl = false;
    for c in out.chars() {
        if c.is_whitespace() {
            if !prev_nl { result.push('\n'); }
            prev_nl = true;
        } else {
            result.push(c);
            prev_nl = false;
        }
    }
    result.trim().to_string()
}

fn parse_rfc2822(s: &str) -> Option<String> {
    chrono::DateTime::parse_from_rfc2822(s)
        .ok()
        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
}
