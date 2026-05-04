use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub client_id: Option<i64>,
    pub status: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub task_count: i64,
    pub done_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectPayload {
    pub name: String,
    pub client_id: Option<i64>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectPayload {
    pub name: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub description: Option<String>,
}

fn map_row(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        client_id: row.get(2)?,
        status: row.get(3)?,
        start_date: row.get(4)?,
        end_date: row.get(5)?,
        description: row.get(6)?,
        created_at: row.get(7)?,
        task_count: row.get(8)?,
        done_count: row.get(9)?,
    })
}

pub fn get_all(pool: &DbPool) -> DbResult<Vec<Project>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.client_id, p.status, p.start_date, p.end_date, p.description, p.created_at,
                COUNT(t.id) as task_count,
                SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
         FROM projects p
         LEFT JOIN tasks t ON t.project_id = p.id
         GROUP BY p.id
         ORDER BY p.created_at DESC",
    )?;
    let projects = stmt.query_map([], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(projects)
}

pub fn create(pool: &DbPool, payload: CreateProjectPayload) -> DbResult<Project> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO projects (name, client_id, status, start_date, end_date, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            payload.name,
            payload.client_id,
            payload.status.unwrap_or_else(|| "active".to_string()),
            payload.start_date,
            payload.end_date,
            payload.description,
        ],
    )?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.client_id, p.status, p.start_date, p.end_date, p.description, p.created_at,
                0 as task_count, 0 as done_count
         FROM projects p WHERE p.id = ?1",
    )?;
    Ok(stmt.query_row(params![id], map_row)?)
}

const SELECT_WITH_COUNTS: &str =
    "SELECT p.id, p.name, p.client_id, p.status, p.start_date, p.end_date, p.description, p.created_at,
            COUNT(t.id) as task_count,
            SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
     FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.id = ?1 GROUP BY p.id";

pub fn update(pool: &DbPool, id: i64, p: UpdateProjectPayload) -> DbResult<Project> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE projects SET
           name        = COALESCE(?1, name),
           status      = COALESCE(?2, status),
           start_date  = ?3,
           end_date    = ?4,
           description = ?5
         WHERE id = ?6",
        params![p.name, p.status, p.start_date, p.end_date, p.description, id],
    )?;
    let mut stmt = conn.prepare(SELECT_WITH_COUNTS)?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("UPDATE tasks SET project_id = NULL WHERE project_id = ?1", params![id])?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}
