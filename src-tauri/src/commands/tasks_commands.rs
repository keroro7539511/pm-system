use chrono::{Datelike, Duration, Local};
use serde::Serialize;
use tauri::State;

use crate::db::{tasks, DbPool};

type CmdResult<T> = Result<T, String>;

#[derive(Debug, Serialize)]
pub struct TaskTrendPoint {
    pub week: String,
    pub completed: i64,
    pub created: i64,
}

#[tauri::command]
pub async fn get_task_trend(pool: State<'_, DbPool>) -> CmdResult<Vec<TaskTrendPoint>> {
    let conn = pool.get().map_err(|e| e.to_string())?;

    let today = Local::now().date_naive();
    let this_monday = today - Duration::days(today.weekday().num_days_from_monday() as i64);

    let mut trend = Vec::with_capacity(12);
    for i in (0..12).rev() {
        let week_start = this_monday - Duration::weeks(i);
        let week_end   = week_start  + Duration::weeks(1);
        let ws = week_start.to_string();
        let we = week_end.to_string();

        let completed: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks \
                 WHERE status = 'done' AND date(completed_at) >= ?1 AND date(completed_at) < ?2",
                rusqlite::params![ws, we],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let created: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE date(created_at) >= ?1 AND date(created_at) < ?2",
                rusqlite::params![ws, we],
                |r| r.get(0),
            )
            .unwrap_or(0);

        trend.push(TaskTrendPoint {
            week: format!("{}/{}", week_start.month(), week_start.day()),
            completed,
            created,
        });
    }
    Ok(trend)
}

#[tauri::command]
pub async fn get_tasks(
    pool: State<'_, DbPool>,
    status: Option<String>,
) -> CmdResult<Vec<tasks::Task>> {
    tasks::get_all(&pool, status).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_task(
    pool: State<'_, DbPool>,
    payload: tasks::CreateTaskPayload,
) -> CmdResult<tasks::Task> {
    tasks::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task(
    pool: State<'_, DbPool>,
    id: i64,
    payload: tasks::UpdateTaskPayload,
) -> CmdResult<tasks::Task> {
    tasks::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_task(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    tasks::delete(&pool, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_stats(pool: State<'_, DbPool>) -> CmdResult<tasks::TaskStats> {
    tasks::stats(&pool).map_err(|e| e.to_string())
}
