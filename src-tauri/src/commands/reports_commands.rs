use serde::{Deserialize, Serialize};
use tauri::State;

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
    pub emails_done: i64,
    pub emails_pending: i64,
    pub emails_converted: i64,
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

    let emails_done = emails_replied;

    let emails_pending: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM emails WHERE status IN ('unread', 'read', 'pending')",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let emails_converted: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM emails WHERE status = 'converted' \
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
    if emails_done > 0 { highlights.push(format!("本週完成(已回覆) {} 封信件", emails_done)); }
    if emails_pending > 0 { highlights.push(format!("目前有 {} 封信件待處理", emails_pending)); }
    if emails_converted > 0 { highlights.push(format!("本週 {} 封信件已轉為需求", emails_converted)); }
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
        emails_done,
        emails_pending,
        emails_converted,
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

// ── Weekly Excel Export ──────────────────────────────────────────────────────

fn status_label(s: &str) -> &str {
    match s {
        "todo"        => "待辦",
        "in_progress" => "進行中",
        "review"      => "審核中",
        "done"        => "已完成",
        "overdue"     => "已逾期",
        other         => other,
    }
}

fn priority_label(s: &str) -> &str {
    match s {
        "P0" => "緊急",
        "P1" => "高",
        "P2" => "中",
        "P3" => "低",
        other => other,
    }
}

#[tauri::command]
pub async fn export_weekly_excel(save_path: String, pool: State<'_, DbPool>) -> CmdResult<()> {
    use rust_xlsxwriter::{Color, Format, FormatAlign, FormatBorder, Workbook};

    use chrono::{Datelike, Duration, Local};

    let conn = pool.get().map_err(|e| e.to_string())?;

    let today = Local::now().date_naive();
    let monday = today - Duration::days(today.weekday().num_days_from_monday() as i64);
    let sunday = monday + Duration::days(6);
    let mon_str = monday.to_string();
    let sun_str = sunday.to_string();

    // Include non-done tasks + tasks completed this week; completed tasks sort first
    let mut stmt = conn.prepare(
        "SELECT COALESCE(p.name, '（無專案）') as proj_name,
                t.title,
                COALESCE(t.description, ''),
                t.status,
                t.priority,
                COALESCE(t.assignee, ''),
                COALESCE(t.start_date, ''),
                COALESCE(t.due_date, '')
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         WHERE t.status NOT IN ('done')
            OR (t.status = 'done'
                AND date(t.completed_at) >= ?1
                AND date(t.completed_at) <= ?2)
         ORDER BY CASE WHEN t.status = 'done' THEN 0 ELSE 1 END,
                  proj_name,
                  CASE t.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1
                                  WHEN 'P2' THEN 2 ELSE 3 END,
                  t.created_at",
    ).map_err(|e| e.to_string())?;

    struct TaskRow {
        project: String,
        title: String,
        description: String,
        status: String,
        priority: String,
        assignee: String,
        start_date: String,
        due_date: String,
    }

    let tasks: Vec<TaskRow> = stmt
        .query_map(rusqlite::params![mon_str, sun_str], |row| {
            Ok(TaskRow {
                project:     row.get(0)?,
                title:       row.get(1)?,
                description: row.get(2)?,
                status:      row.get(3)?,
                priority:    row.get(4)?,
                assignee:    row.get(5)?,
                start_date:  row.get(6)?,
                due_date:    row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // ── Build workbook ──────────────────────────────────────────────────────
    let mut workbook = Workbook::new();
    let ws = workbook.add_worksheet();

    // Column widths matching sample.xlsx (in character units)
    ws.set_column_width(0, 11.18).map_err(|e| e.to_string())?; // 專案/產品
    ws.set_column_width(1, 18.0 ).map_err(|e| e.to_string())?; // 任務名稱 (wider than sample for readability)
    ws.set_column_width(2, 25.0 ).map_err(|e| e.to_string())?; // 說明
    ws.set_column_width(3,  8.0 ).map_err(|e| e.to_string())?; // 狀態
    ws.set_column_width(4,  8.18).map_err(|e| e.to_string())?; // 優先度
    ws.set_column_width(5, 10.0 ).map_err(|e| e.to_string())?; // 負責人
    ws.set_column_width(6, 10.0 ).map_err(|e| e.to_string())?; // 開始日
    ws.set_column_width(7, 10.0 ).map_err(|e| e.to_string())?; // 結束日
    ws.set_column_width(8, 13.27).map_err(|e| e.to_string())?; // Next Action

    // Formats
    let header_fmt = Format::new()
        .set_bold()
        .set_background_color(Color::RGB(0xCCE4F6))
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
        .set_text_wrap();

    // A column: centered, white bg
    let proj_fmt = Format::new()
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
        .set_text_wrap();

    // B-H columns: left aligned
    let left_fmt = Format::new()
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Left)
        .set_align(FormatAlign::VerticalCenter)
        .set_text_wrap();

    // I column (Next Action): same as left
    let next_fmt = Format::new()
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Left)
        .set_align(FormatAlign::VerticalCenter)
        .set_text_wrap();

    // Header row (row 0)
    let headers = ["專案/產品", "任務名稱", "說明", "狀態", "優先度", "負責人", "開始日", "結束日", "Next Action"];
    for (col, h) in headers.iter().enumerate() {
        ws.write_with_format(0, col as u16, *h, &header_fmt).map_err(|e| e.to_string())?;
    }

    // Data rows — show project name only on first row of each group
    let mut current_project = String::new();
    for (i, task) in tasks.iter().enumerate() {
        let row = (i + 1) as u32;

        // Column A: project name only on first occurrence
        let proj_cell = if task.project != current_project {
            current_project = task.project.clone();
            task.project.as_str()
        } else {
            ""
        };
        ws.write_with_format(row, 0, proj_cell, &proj_fmt).map_err(|e| e.to_string())?;

        ws.write_with_format(row, 1, &task.title,                    &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 2, &task.description,              &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 3, status_label(&task.status),     &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 4, priority_label(&task.priority),  &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 5, &task.assignee,                 &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 6, &task.start_date,               &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 7, &task.due_date,                 &left_fmt).map_err(|e| e.to_string())?;
        ws.write_with_format(row, 8, "",                             &next_fmt).map_err(|e| e.to_string())?;
    }

    workbook.save(&save_path).map_err(|e| e.to_string())?;
    Ok(())
}
