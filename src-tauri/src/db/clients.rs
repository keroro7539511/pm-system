use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Client {
    pub id: i64,
    pub name: String,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub industry: Option<String>,
    pub priority: i64,
    pub last_contact_at: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub email_count: i64,
    pub unread_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientPayload {
    pub name: String,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub industry: Option<String>,
    pub priority: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateClientPayload {
    pub name: Option<String>,
    pub contact_person: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub industry: Option<String>,
    pub priority: Option<i64>,
    pub notes: Option<String>,
}

fn map_row(row: &Row) -> rusqlite::Result<Client> {
    Ok(Client {
        id: row.get(0)?,
        name: row.get(1)?,
        contact_person: row.get(2)?,
        email: row.get(3)?,
        phone: row.get(4)?,
        industry: row.get(5)?,
        priority: row.get(6)?,
        last_contact_at: row.get(7)?,
        notes: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        email_count: row.get(11)?,
        unread_count: row.get(12)?,
    })
}

pub fn get_all(pool: &DbPool) -> DbResult<Vec<Client>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.industry,
                c.priority, c.last_contact_at, c.notes, c.created_at, c.updated_at,
                COUNT(e.id) as email_count,
                SUM(CASE WHEN e.status = 'unread' THEN 1 ELSE 0 END) as unread_count
         FROM clients c
         LEFT JOIN emails e ON e.client_id = c.id
         GROUP BY c.id
         ORDER BY c.priority ASC, c.last_contact_at DESC NULLS LAST",
    )?;
    let items = stmt.query_map([], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

pub fn create(pool: &DbPool, p: CreateClientPayload) -> DbResult<Client> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO clients (name, contact_person, email, phone, industry, priority, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![p.name, p.contact_person, p.email, p.phone, p.industry, p.priority.unwrap_or(2), p.notes],
    )?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.industry,
                c.priority, c.last_contact_at, c.notes, c.created_at, c.updated_at,
                0 as email_count, 0 as unread_count
         FROM clients c WHERE c.id = ?1",
    )?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn update(pool: &DbPool, id: i64, p: UpdateClientPayload) -> DbResult<Client> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE clients SET
            name            = COALESCE(?1, name),
            contact_person  = ?2,
            email           = ?3,
            phone           = ?4,
            industry        = ?5,
            priority        = COALESCE(?6, priority),
            notes           = ?7,
            updated_at      = CURRENT_TIMESTAMP
         WHERE id = ?8",
        params![p.name, p.contact_person, p.email, p.phone, p.industry, p.priority, p.notes, id],
    )?;
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.industry,
                c.priority, c.last_contact_at, c.notes, c.created_at, c.updated_at,
                COUNT(e.id), SUM(CASE WHEN e.status = 'unread' THEN 1 ELSE 0 END)
         FROM clients c LEFT JOIN emails e ON e.client_id = c.id
         WHERE c.id = ?1 GROUP BY c.id",
    )?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM clients WHERE id = ?1", params![id])?;
    Ok(())
}
