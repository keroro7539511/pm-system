use serde::{Deserialize, Serialize};

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
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    let body = serde_json::json!({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "maxOutputTokens": 1024 }
    });

    let resp = client
        .post(url)
        .header("x-goog-api-key", api_key)
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionItemSuggestion {
    pub description: String,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TranscriptSummary {
    pub summary: String,
    pub action_items: Vec<ActionItemSuggestion>,
}

#[tauri::command]
pub async fn summarize_transcript(
    app: tauri::AppHandle,
    transcript: String,
    today: String,
) -> CmdResult<TranscriptSummary> {
    let settings = load_settings_sync(&app);

    if settings.ai_api_key.is_empty() {
        return Err("請先在設定頁填入 API Key".to_string());
    }

    let prompt = format!(
        "你是一位台灣 PM 的專業會議助理。請分析以下會議逐字稿，回傳**純 JSON**（不要有任何 markdown 標記）。\n\
         格式：\n\
         {{\"summary\":\"...\",\"action_items\":[{{\"description\":\"...\",\"assignee\":\"...\",\"due_date\":\"YYYY-MM-DD\"}}]}}\n\n\
         規則：\n\
         - summary：200 字以內，繁體中文，說明討論重點與決議\n\
         - action_items：只列有人名與明確動作的待辦，assignee 填姓名（無則 null），\
           due_date 填明確日期（今天 {today}，無截止日填 null）\n\n\
         逐字稿：\n{transcript}"
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let text = match settings.ai_provider.as_str() {
        "openai" => call_openai(&client, &settings.ai_api_key, &prompt).await?,
        "claude" => call_claude(&client, &settings.ai_api_key, &prompt).await?,
        _ => call_gemini(&client, &settings.ai_api_key, &prompt).await?,
    };

    parse_summary_json(&text)
}

fn parse_summary_json(text: &str) -> CmdResult<TranscriptSummary> {
    let start = text.find('{').ok_or("AI 回傳格式錯誤：找不到 JSON 物件")?;
    let end = text.rfind('}').ok_or("AI 回傳格式錯誤：JSON 物件未閉合")?;
    let json_str = &text[start..=end];

    let v: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| format!("AI 回傳 JSON 解析失敗：{e}"))?;

    let summary = v["summary"].as_str().unwrap_or("").to_string();
    let action_items = v["action_items"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|item| ActionItemSuggestion {
            description: item["description"].as_str().unwrap_or("").to_string(),
            assignee:    item["assignee"].as_str().map(|s| s.to_string()),
            due_date:    item["due_date"].as_str()
                .filter(|s| !s.is_empty() && *s != "null")
                .map(|s| s.to_string()),
        })
        .filter(|a| !a.description.is_empty())
        .collect();

    Ok(TranscriptSummary { summary, action_items })
}

fn handle_error_status(status: u16, provider: &str) -> CmdResult<()> {
    match status {
        200..=299 => Ok(()),
        401 | 403 => Err(format!("{provider} API Key 無效或無權限，請重新確認")),
        429 => Err("API 呼叫次數已達上限，請稍後再試".to_string()),
        s => Err(format!("{provider} API 錯誤 {s}")),
    }
}
