use serde_json::Value;

pub async fn trigger(webhook_url: &str, payload: Value) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    client
        .post(webhook_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
