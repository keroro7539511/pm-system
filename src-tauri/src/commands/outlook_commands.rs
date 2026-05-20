type CmdResult<T> = Result<T, String>;

/// Send an email via the locally installed mail application.
/// Windows: PowerShell COM automation via Outlook.
/// macOS:   AppleScript via Mail.app.
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

#[cfg(target_os = "macos")]
fn send_impl(to: String, subject: String, body: String) -> CmdResult<()> {
    // Arguments are passed as argv to avoid AppleScript injection.
    const SCRIPT: &str = "\
on run argv\n\
    set theTo to item 1 of argv\n\
    set theSubject to item 2 of argv\n\
    set theBody to item 3 of argv\n\
    tell application \"Microsoft Outlook\"\n\
        set m to make new outgoing message\n\
        set subject of m to theSubject\n\
        set plain text content of m to theBody\n\
        make new to recipient at m with properties {email address:{address:theTo}}\n\
        send m\n\
    end tell\n\
end run";

    let out = std::process::Command::new("osascript")
        .args(["-e", SCRIPT, "--", &to, &subject, &body])
        .output()
        .map_err(|e| format!("無法執行 osascript：{e}"))?;

    if out.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&out.stderr);
        Err(format!("Outlook for Mac 寄信失敗：{stderr}"))
    }
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn send_impl(_to: String, _subject: String, _body: String) -> CmdResult<()> {
    Err("本機郵件寄信僅支援 Windows 與 macOS".to_string())
}
