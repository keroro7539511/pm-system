use chrono::{Datelike, Duration, Local, NaiveDate};
use serde::Serialize;
use std::collections::HashMap;
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
    let twelve_weeks_ago = (this_monday - Duration::weeks(11)).to_string();

    // One query for completed tasks (grouped by date)
    let mut completed_by_date: HashMap<NaiveDate, i64> = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT date(completed_at), COUNT(*) FROM tasks \
                 WHERE status = 'done' AND date(completed_at) >= ?1 \
                 GROUP BY date(completed_at)",
            )
            .map_err(|e| e.to_string())?;
        stmt.query_map([&twelve_weeks_ago], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .for_each(|(d, cnt)| {
            if let Ok(date) = NaiveDate::parse_from_str(&d, "%Y-%m-%d") {
                *completed_by_date.entry(date).or_insert(0) += cnt;
            }
        });
    }

    // One query for created tasks (grouped by date)
    let mut created_by_date: HashMap<NaiveDate, i64> = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT date(created_at), COUNT(*) FROM tasks \
                 WHERE date(created_at) >= ?1 \
                 GROUP BY date(created_at)",
            )
            .map_err(|e| e.to_string())?;
        stmt.query_map([&twelve_weeks_ago], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        })
        .map_err(|e| e.to_string())?
        .flatten()
        .for_each(|(d, cnt)| {
            if let Ok(date) = NaiveDate::parse_from_str(&d, "%Y-%m-%d") {
                *created_by_date.entry(date).or_insert(0) += cnt;
            }
        });
    }

    // Aggregate by week in Rust
    let mut trend = Vec::with_capacity(12);
    for i in (0..12i64).rev() {
        let week_start = this_monday - Duration::weeks(i);
        let completed: i64 = (0..7i64)
            .map(|d| *completed_by_date.get(&(week_start + Duration::days(d))).unwrap_or(&0))
            .sum();
        let created: i64 = (0..7i64)
            .map(|d| *created_by_date.get(&(week_start + Duration::days(d))).unwrap_or(&0))
            .sum();
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
