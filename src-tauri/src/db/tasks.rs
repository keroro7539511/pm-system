use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub project_id: Option<i64>,
    pub goal_id: Option<i64>,
    pub assignee: Option<String>,
    pub priority: String,
    pub status: String,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub tags: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskPayload {
    pub title: String,
    pub description: Option<String>,
    pub project_id: Option<i64>,
    pub goal_id: Option<i64>,
    pub assignee: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub tags: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskPayload {
    pub title: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<i64>,
    pub goal_id: Option<i64>,
    pub assignee: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub tags: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TaskStats {
    pub total: i64,
    pub done: i64,
    pub in_progress: i64,
    pub todo: i64,
    pub overdue: i64,
}

const SELECT_COLS: &str = "id, title, description, project_id, assignee, priority, status, start_date, due_date, estimated_hours, actual_hours, tags, created_at, completed_at, goal_id";

fn map_row(row: &Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        project_id: row.get(3)?,
        assignee: row.get(4)?,
        priority: row.get(5)?,
        status: row.get(6)?,
        start_date: row.get(7)?,
        due_date: row.get(8)?,
        estimated_hours: row.get(9)?,
        actual_hours: row.get(10)?,
        tags: row.get(11)?,
        created_at: row.get(12)?,
        completed_at: row.get(13)?,
        goal_id: row.get(14)?,
    })
}

pub fn get_all(pool: &DbPool, status_filter: Option<String>) -> DbResult<Vec<Task>> {
    let conn = pool.get()?;
    let sql = if status_filter.is_some() {
        format!("SELECT {SELECT_COLS} FROM tasks WHERE status = ?1 ORDER BY due_date ASC, created_at DESC")
    } else {
        format!("SELECT {SELECT_COLS} FROM tasks ORDER BY due_date ASC, created_at DESC")
    };
    let mut stmt = conn.prepare(&sql)?;
    let tasks = if let Some(s) = status_filter {
        stmt.query_map(params![s], map_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    } else {
        stmt.query_map([], map_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };
    Ok(tasks)
}

pub fn create(pool: &DbPool, payload: CreateTaskPayload) -> DbResult<Task> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO tasks (title, description, project_id, goal_id, assignee, priority, status, start_date, due_date, estimated_hours, tags)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            payload.title,
            payload.description,
            payload.project_id,
            payload.goal_id,
            payload.assignee,
            payload.priority.unwrap_or_else(|| "P2".to_string()),
            payload.status.unwrap_or_else(|| "todo".to_string()),
            payload.start_date,
            payload.due_date,
            payload.estimated_hours,
            payload.tags,
        ],
    )?;
    let id = conn.last_insert_rowid();
    let sql = format!("SELECT {SELECT_COLS} FROM tasks WHERE id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn update(pool: &DbPool, id: i64, p: UpdateTaskPayload) -> DbResult<Task> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE tasks SET
           title            = COALESCE(?1, title),
           description      = ?2,
           project_id       = ?3,
           goal_id          = ?4,
           assignee         = ?5,
           priority         = COALESCE(?6, priority),
           status           = COALESCE(?7, status),
           start_date       = ?8,
           due_date         = ?9,
           estimated_hours  = ?10,
           actual_hours     = ?11,
           tags             = ?12,
           completed_at     = CASE
             WHEN COALESCE(?7, status) = 'done' THEN COALESCE(?13, completed_at, datetime('now'))
             ELSE NULL
           END
         WHERE id = ?14",
        params![
            p.title,
            p.description,
            p.project_id,
            p.goal_id,
            p.assignee,
            p.priority,
            p.status,
            p.start_date,
            p.due_date,
            p.estimated_hours,
            p.actual_hours,
            p.tags,
            p.completed_at,
            id,
        ],
    )?;
    let sql = format!("SELECT {SELECT_COLS} FROM tasks WHERE id = ?1");
    let mut stmt = conn.prepare(&sql)?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn stats(pool: &DbPool) -> DbResult<TaskStats> {
    let conn = pool.get()?;
    Ok(conn.query_row(
        "SELECT
           COUNT(*),
           SUM(CASE WHEN status = 'done'        THEN 1 ELSE 0 END),
           SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END),
           SUM(CASE WHEN status = 'todo'        THEN 1 ELSE 0 END),
           SUM(CASE WHEN status != 'done' AND due_date < date('now') THEN 1 ELSE 0 END)
         FROM tasks",
        [],
        |r| Ok(TaskStats {
            total:       r.get(0)?,
            done:        r.get(1)?,
            in_progress: r.get(2)?,
            todo:        r.get(3)?,
            overdue:     r.get(4)?,
        }),
    )?)
}
