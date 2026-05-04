use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Email {
    pub id: i64,
    pub gmail_id: Option<String>,
    pub subject: Option<String>,
    pub sender: Option<String>,
    pub body: Option<String>,
    pub ai_summary: Option<String>,
    pub category: Option<String>,
    pub status: String,
    pub client_id: Option<i64>,
    pub received_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IncomingEmail {
    pub gmail_id: Option<String>,
    pub subject: String,
    pub sender: String,
    pub body: Option<String>,
    pub ai_summary: Option<String>,
    pub category: Option<String>,
    pub client_id: Option<i64>,
    pub received_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEmailPayload {
    pub status: Option<String>,
    pub ai_summary: Option<String>,
    pub category: Option<String>,
    pub client_id: Option<i64>,
}

fn map_row(row: &Row) -> rusqlite::Result<Email> {
    Ok(Email {
        id: row.get(0)?,
        gmail_id: row.get(1)?,
        subject: row.get(2)?,
        sender: row.get(3)?,
        body: row.get(4)?,
        ai_summary: row.get(5)?,
        category: row.get(6)?,
        status: row.get(7)?,
        client_id: row.get(8)?,
        received_at: row.get(9)?,
        created_at: row.get(10)?,
    })
}

const SELECT_COLS: &str =
    "id, gmail_id, subject, sender, body, ai_summary, category, status, client_id, received_at, created_at";

pub fn get_all(pool: &DbPool, client_id: Option<i64>, status: Option<String>) -> DbResult<Vec<Email>> {
    let conn = pool.get()?;
    let sql = match (client_id, &status) {
        (Some(_), Some(_)) => format!("SELECT {SELECT_COLS} FROM emails WHERE client_id = ?1 AND status = ?2 ORDER BY received_at DESC"),
        (Some(_), None)    => format!("SELECT {SELECT_COLS} FROM emails WHERE client_id = ?1 ORDER BY received_at DESC"),
        (None, Some(_))    => format!("SELECT {SELECT_COLS} FROM emails WHERE status = ?1 ORDER BY received_at DESC"),
        (None, None)       => format!("SELECT {SELECT_COLS} FROM emails ORDER BY received_at DESC"),
    };
    let mut stmt = conn.prepare(&sql)?;
    let emails = match (client_id, status) {
        (Some(cid), Some(s)) => stmt.query_map(params![cid, s], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?,
        (Some(cid), None)    => stmt.query_map(params![cid], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?,
        (None, Some(s))      => stmt.query_map(params![s], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?,
        (None, None)         => stmt.query_map([], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?,
    };
    Ok(emails)
}

pub fn insert(pool: &DbPool, e: IncomingEmail) -> DbResult<Email> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT OR IGNORE INTO emails (gmail_id, subject, sender, body, ai_summary, category, client_id, received_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![e.gmail_id, e.subject, e.sender, e.body, e.ai_summary, e.category, e.client_id, e.received_at],
    )?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn.prepare(&format!("SELECT {SELECT_COLS} FROM emails WHERE id = ?1"))?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn update(pool: &DbPool, id: i64, p: UpdateEmailPayload) -> DbResult<Email> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE emails SET
            status      = COALESCE(?1, status),
            ai_summary  = COALESCE(?2, ai_summary),
            category    = COALESCE(?3, category),
            client_id   = COALESCE(?4, client_id)
         WHERE id = ?5",
        params![p.status, p.ai_summary, p.category, p.client_id, id],
    )?;
    let mut stmt = conn.prepare(&format!("SELECT {SELECT_COLS} FROM emails WHERE id = ?1"))?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM emails WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn mark_read(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("UPDATE emails SET status = 'read' WHERE id = ?1 AND status = 'unread'", params![id])?;
    Ok(())
}

pub fn unread_count(pool: &DbPool) -> DbResult<i64> {
    let conn = pool.get()?;
    Ok(conn.query_row("SELECT COUNT(*) FROM emails WHERE status = 'unread'", [], |r| r.get(0))?)
}
