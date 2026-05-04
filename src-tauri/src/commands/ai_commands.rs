use serde::Deserialize;

use crate::commands::settings_commands::load_settings_sync;

type CmdResult<T> = Result<T, String>;

// ── Gemini ──────────────────────────────────────────────────────

#[derive(Deserialize)]
struct GeminiResponse {
    candidates: Vec<GeminiCandidate>,
}
#[derive(Deserialize)]
struct GeminiCandidate {
    content: GeminiContent,
}
#[derive(Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}
#[derive(Deserialize)]
struct GeminiPart {
    text: String,
}

// ── OpenAI ──────────────────────────────────────────────────────

#[derive(Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
}
#[derive(Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}
#[derive(Deserialize)]
struct OpenAIMessage {
    content: String,
}

// ── Claude ──────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContent>,
}
#[derive(Deserialize)]
struct ClaudeContent {
    text: String,
}

// ── Command ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn generate_email_draft(
    app: tauri::AppHandle,
    subject: String,
    sender: String,
    body: String,
) -> CmdResult<String> {
    let settings = load_settings_sync(&app);

    if settings.ai_api_key.is_empty() {
        return Err("請先在設定頁填入 API Key".to_string());
    }

    let prompt = format!(
        "你是一位台灣 PM 的專業助理。請根據以下客戶來信，用繁體中文撰寫一封適當的回覆草稿。\n\
         回覆需語氣專業友善、確認來信重點、提出明確後續行動。\n\n\
         寄件者：{sender}\n\
         主旨：{subject}\n\n\
         信件內容：\n{body}\n\n\
         直接輸出回覆草稿內容，不要加「以下是草稿」等說明文字。"
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    match settings.ai_provider.as_str() {
        "openai" => call_openai(&client, &settings.ai_api_key, &prompt).await,
        "claude" => call_claude(&client, &settings.ai_api_key, &prompt).await,
        _ => call_gemini(&client, &settings.ai_api_key, &prompt).await,
    }
}

async fn call_gemini(client: &reqwest::Client, api_key: &str, prompt: &str) -> CmdResult<String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    );
    let body = serde_json::json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "maxOutputTokens": 1024 }
    });

    let resp = client
        .post(&url)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("網路錯誤：{e}"))?;

    handle_error_status(resp.status().as_u16(), "Gemini")?;

    resp.json::<GeminiResponse>()
        .await
        .map_err(|e| format!("回應解析失敗：{e}"))?
        .candidates
        .into_iter()
        .next()
        .and_then(|c| c.content.parts.into_iter().next())
        .map(|p| p.text)
        .ok_or_else(|| "AI 回傳空內容".to_string())
}

async fn call_openai(client: &reqwest::Client, api_key: &str, prompt: &str) -> CmdResult<String> {
    let body = serde_json::json!({
        "model": "gpt-4o-mini",
        "max_tokens": 1024,
        "messages": [{ "role": "user", "content": prompt }]
    });

    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {api_key}"))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("網路錯誤：{e}"))?;

    handle_error_status(resp.status().as_u16(), "OpenAI")?;

    resp.json::<OpenAIResponse>()
        .await
        .map_err(|e| format!("回應解析失敗：{e}"))?
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "AI 回傳空內容".to_string())
}

async fn call_claude(client: &reqwest::Client, api_key: &str, prompt: &str) -> CmdResult<String> {
    let body = serde_json::json!({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "messages": [{ "role": "user", "content": prompt }]
    });

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("網路錯誤：{e}"))?;

    handle_error_status(resp.status().as_u16(), "Claude")?;

    resp.json::<ClaudeResponse>()
        .await
        .map_err(|e| format!("回應解析失敗：{e}"))?
        .content
        .into_iter()
        .next()
        .map(|c| c.text)
        .ok_or_else(|| "AI 回傳空內容".to_string())
}

fn handle_error_status(status: u16, provider: &str) -> CmdResult<()> {
    match status {
        200..=299 => Ok(()),
        401 | 403 => Err(format!("{provider} API Key 無效或無權限，請重新確認")),
        429 => Err("API 呼叫次數已達上限，請稍後再試".to_string()),
        s => Err(format!("{provider} API 錯誤 {s}")),
    }
}
