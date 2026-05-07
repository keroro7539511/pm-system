use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

use crate::db::DbPool;

type CmdResult<T> = Result<T, String>;

#[derive(Debug, Serialize)]
pub struct WeeklyReport {
    pub period_start: String,
    pub period_end: String,
    pub tasks_completed: i64,
    pub tasks_created: i64,
    pub tasks_overdue: i64,
    pub emails_received: i64,
    pub emails_replied: i64,
    pub active_projects: Vec<ProjectSummary>,
    pub highlights: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ProjectSummary {
    pub name: String,
    pub status: String,
    pub progress_pct: i64,
    pub task_count: i64,
    pub done_count: i64,
}

#[tauri::command]
pub async fn generate_weekly_report(pool: State<'_, DbPool>) -> CmdResult<WeeklyReport> {
    use chrono::{Datelike, Duration, Local};

    let conn = pool.get().map_err(|e| e.to_string())?;

    let today = Local::now().date_naive();
    let monday = today - Duration::days(today.weekday().num_days_from_monday() as i64);
    let friday = monday + Duration::days(4);
    let mon_str = monday.to_string();
    let fri_str = friday.to_string();

    let tasks_completed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 'done' \
             AND date(completed_at) >= ?1 AND date(completed_at) <= ?2",
            rusqlite::params![mon_str, fri_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let tasks_created: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE date(created_at) >= ?1 AND date(created_at) <= ?2",
            rusqlite::params![mon_str, fri_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let tasks_overdue: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status NOT IN ('done') AND due_date < date('now')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let emails_received: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM emails WHERE date(received_at) >= ?1 AND date(received_at) <= ?2",
            rusqlite::params![mon_str, fri_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let emails_replied: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM emails WHERE status = 'replied' \
             AND date(received_at) >= ?1 AND date(received_at) <= ?2",
            rusqlite::params![mon_str, fri_str],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let mut proj_stmt = conn.prepare(
        "SELECT p.name, p.status, COUNT(t.id), SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)
         FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
         WHERE p.status = 'active' GROUP BY p.id ORDER BY p.name",
    ).map_err(|e| e.to_string())?;

    let active_projects: Vec<ProjectSummary> = proj_stmt
        .query_map([], |row| {
            let name: String = row.get(0)?;
            let status: String = row.get(1)?;
            let task_count: i64 = row.get(2)?;
            let done_count: i64 = row.get::<_, Option<i64>>(3)?.unwrap_or(0);
            let progress_pct = if task_count > 0 { done_count * 100 / task_count } else { 0 };
            Ok(ProjectSummary { name, status, progress_pct, task_count, done_count })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut highlights = Vec::new();
    if tasks_completed > 0 { highlights.push(format!("本週完成 {} 個任務", tasks_completed)); }
    if emails_received > 0 { highlights.push(format!("收到 {} 封客戶信件", emails_received)); }
    if tasks_overdue > 0 { highlights.push(format!("⚠️ 有 {} 個任務已逾期，需要跟進", tasks_overdue)); }
    for p in &active_projects {
        if p.progress_pct >= 80 { highlights.push(format!("「{}」進度已達 {}%，接近完成", p.name, p.progress_pct)); }
    }

    let period_start = mon_str;
    let period_end   = fri_str;

    Ok(WeeklyReport {
        period_start,
        period_end,
        tasks_completed,
        tasks_created,
        tasks_overdue,
        emails_received,
        emails_replied,
        active_projects,
        highlights,
    })
}

// ── Export / Import ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub exported_at: String,
    pub version: String,
    pub tasks: serde_json::Value,
    pub projects: serde_json::Value,
    pub clients: serde_json::Value,
    pub emails: serde_json::Value,
    pub documents: serde_json::Value,
}

#[tauri::command]
pub async fn export_data(save_path: String, pool: State<'_, DbPool>) -> CmdResult<()> {
    let conn = pool.get().map_err(|e| e.to_string())?;

    fn query_json(conn: &rusqlite::Connection, sql: &str) -> serde_json::Value {
        let mut stmt = conn.prepare(sql).unwrap();
        let cols: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let rows: Vec<serde_json::Value> = stmt
            .query_map([], |row| {
                let mut map = serde_json::Map::new();
                for (i, col) in cols.iter().enumerate() {
                    let val: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
                    map.insert(col.clone(), match val {
                        rusqlite::types::Value::Null => serde_json::Value::Null,
                        rusqlite::types::Value::Integer(n) => serde_json::Value::Number(n.into()),
                        rusqlite::types::Value::Real(f) => serde_json::json!(f),
                        rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                        rusqlite::types::Value::Blob(_) => serde_json::Value::Null,
                    });
                }
                Ok(serde_json::Value::Object(map))
            })
            .into_iter()
            .flatten()
            .filter_map(|r| r.ok())
            .collect();
        serde_json::Value::Array(rows)
    }

    use chrono::Local;
    let export = ExportData {
        exported_at: Local::now().to_rfc3339(),
        version: "1.0".to_string(),
        tasks: query_json(&conn, "SELECT * FROM tasks"),
        projects: query_json(&conn, "SELECT * FROM projects"),
        clients: query_json(&conn, "SELECT * FROM clients"),
        emails: query_json(&conn, "SELECT * FROM emails"),
        documents: query_json(&conn, "SELECT * FROM documents"),
    };

    let json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    std::fs::write(&save_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn check_for_updates(_app: tauri::AppHandle) -> CmdResult<String> {
    Ok("自動更新功能尚未設定".to_string())
}
