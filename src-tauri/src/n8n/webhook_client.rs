use serde_json::Value;

pub async fn trigger(webhook_url: &str, payload: Value) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post(webhook_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("網路錯誤：{e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Webhook 回應 HTTP {}（{}）— 請確認 n8n 流程已 Activate 且 URL 正確",
            status.as_u16(),
            if body.is_empty() { "無內容".to_string() } else { body.chars().take(120).collect::<String>() }
        ));
    }

    Ok(())
}
