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
