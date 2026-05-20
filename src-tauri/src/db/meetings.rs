use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Meeting {
    pub id: i64,
    pub title: String,
    pub meeting_date: Option<String>,
    pub attendees: Option<String>,
    pub transcript: Option<String>,
    pub ai_summary: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateMeetingPayload {
    pub title: String,
    pub meeting_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMeetingPayload {
    pub title: Option<String>,
    pub meeting_date: Option<String>,
    pub transcript: Option<String>,
    pub ai_summary: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActionItem {
    pub id: i64,
    pub meeting_id: i64,
    pub description: String,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub task_id: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ActionItemInput {
    pub description: String,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
}

fn map_meeting(row: &Row) -> rusqlite::Result<Meeting> {
    Ok(Meeting {
        id:           row.get(0)?,
        title:        row.get(1)?,
        meeting_date: row.get(2)?,
        attendees:    row.get(3)?,
        transcript:   row.get(4)?,
        ai_summary:   row.get(5)?,
        created_at:   row.get::<_, Option<String>>(6)?.unwrap_or_default(),
    })
}

fn map_action_item(row: &Row) -> rusqlite::Result<ActionItem> {
    Ok(ActionItem {
        id:          row.get(0)?,
        meeting_id:  row.get(1)?,
        description: row.get(2)?,
        assignee:    row.get(3)?,
        due_date:    row.get(4)?,
        task_id:     row.get(5)?,
        created_at:  row.get::<_, Option<String>>(6)?.unwrap_or_default(),
    })
}

const COLS: &str =
    "id, title, start_time, attendees, transcript, ai_summary, created_at";

pub fn get_all(pool: &DbPool, search: Option<String>) -> DbResult<Vec<Meeting>> {
    let conn = pool.get()?;
    let sql = if search.is_some() {
        format!(
            "SELECT {COLS} FROM meetings WHERE title LIKE ?1 \
             ORDER BY COALESCE(start_time, created_at) DESC"
        )
    } else {
        format!(
            "SELECT {COLS} FROM meetings \
             ORDER BY COALESCE(start_time, created_at) DESC"
        )
    };
    let mut stmt = conn.prepare(&sql)?;
    let rows = if let Some(q) = search {
        let pattern = format!("%{q}%");
        stmt.query_map(params![pattern], map_meeting)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    } else {
        stmt.query_map([], map_meeting)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };
    Ok(rows)
}

fn get_by_id(pool: &DbPool, id: i64) -> DbResult<Meeting> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(&format!("SELECT {COLS} FROM meetings WHERE id = ?1"))?;
    Ok(stmt.query_row(params![id], map_meeting)?)
}

pub fn create(pool: &DbPool, p: CreateMeetingPayload) -> DbResult<Meeting> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO meetings (title, start_time) VALUES (?1, ?2)",
        params![p.title, p.meeting_date],
    )?;
    get_by_id(pool, conn.last_insert_rowid())
}

pub fn update(pool: &DbPool, id: i64, p: UpdateMeetingPayload) -> DbResult<Meeting> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE meetings SET
            title      = COALESCE(?1, title),
            start_time = ?2,
            transcript = ?3,
            ai_summary = ?4
         WHERE id = ?5",
        params![p.title, p.meeting_date, p.transcript, p.ai_summary, id],
    )?;
    get_by_id(pool, id)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM action_items WHERE meeting_id = ?1", params![id])?;
    conn.execute("DELETE FROM meetings WHERE id = ?1", params![id])?;
    Ok(())
}

// ── Action items ────────────────────────────────────────────────────────────

pub fn get_action_items(pool: &DbPool, meeting_id: i64) -> DbResult<Vec<ActionItem>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, meeting_id, description, assignee, due_date, task_id, created_at
         FROM action_items WHERE meeting_id = ?1 ORDER BY id",
    )?;
    let rows = stmt
        .query_map(params![meeting_id], map_action_item)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn save_action_items(
    pool: &DbPool,
    meeting_id: i64,
    items: Vec<ActionItemInput>,
) -> DbResult<Vec<ActionItem>> {
    let conn = pool.get()?;
    conn.execute(
        "DELETE FROM action_items WHERE meeting_id = ?1",
        params![meeting_id],
    )?;
    drop(conn);
    let mut result = Vec::new();
    for item in items {
        let conn = pool.get()?;
        conn.execute(
            "INSERT INTO action_items (meeting_id, description, assignee, due_date)
             VALUES (?1, ?2, ?3, ?4)",
            params![meeting_id, item.description, item.assignee, item.due_date],
        )?;
        let new_id = conn.last_insert_rowid();
        drop(conn);
        let conn2 = pool.get()?;
        let mut stmt = conn2.prepare(
            "SELECT id, meeting_id, description, assignee, due_date, task_id, created_at
             FROM action_items WHERE id = ?1",
        )?;
        result.push(stmt.query_row(params![new_id], map_action_item)?);
    }
    Ok(result)
}

pub fn link_action_item_task(
    pool: &DbPool,
    action_item_id: i64,
    task_id: i64,
) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE action_items SET task_id = ?1 WHERE id = ?2",
        params![task_id, action_item_id],
    )?;
    Ok(())
}
