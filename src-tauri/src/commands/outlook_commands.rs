type CmdResult<T> = Result<T, String>;

/// Send an email via the locally installed Outlook application.
/// Uses PowerShell COM automation on Windows; returns an error on other platforms.
#[tauri::command]
pub async fn send_outlook_email(
    to: String,
    subject: String,
    body: String,
) -> CmdResult<()> {
    send_impl(to, subject, body)
}

#[cfg(target_os = "windows")]
fn send_impl(to: String, subject: String, body: String) -> CmdResult<()> {
    // Pass content via env-vars to avoid any shell-injection issues.
    const SCRIPT: &str = "\
$o = New-Object -ComObject Outlook.Application; \
$m = $o.CreateItem(0); \
$m.To = $env:PM_MAIL_TO; \
$m.Subject = $env:PM_MAIL_SUBJECT; \
$m.Body = $env:PM_MAIL_BODY; \
$m.Send()";

    let out = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle", "Hidden",
            "-Command", SCRIPT,
        ])
        .env("PM_MAIL_TO",      &to)
        .env("PM_MAIL_SUBJECT", &subject)
        .env("PM_MAIL_BODY",    &body)
        .output()
        .map_err(|e| format!("無法執行 PowerShell：{e}"))?;

    if out.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&out.stderr);
        Err(format!("Outlook 寄信失敗：{stderr}"))
    }
}

#[cfg(not(target_os = "windows"))]
fn send_impl(_to: String, _subject: String, _body: String) -> CmdResult<()> {
    Err("本機 Outlook 寄信僅支援 Windows".to_string())
}
