use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company_name: Option<String>,
    pub company_address: Option<String>,
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateContactPayload {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company_name: Option<String>,
    pub company_address: Option<String>,
    pub project_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactPayload {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub company_name: Option<String>,
    pub company_address: Option<String>,
    pub project_id: Option<i64>,
    pub notes: Option<String>,
}

const SELECT_COLS: &str = "
    c.id, c.name, c.email, c.phone, c.company_name, c.company_address,
    c.project_id, p.name as project_name, c.notes, c.created_at, c.updated_at";

fn map_row(row: &Row) -> rusqlite::Result<Contact> {
    Ok(Contact {
        id:              row.get(0)?,
        name:            row.get(1)?,
        email:           row.get(2)?,
        phone:           row.get(3)?,
        company_name:    row.get(4)?,
        company_address: row.get(5)?,
        project_id:      row.get(6)?,
        project_name:    row.get(7)?,
        notes:           row.get(8)?,
        created_at:      row.get(9)?,
        updated_at:      row.get(10)?,
    })
}

pub fn get_all(pool: &DbPool, project_id: Option<i64>, search: Option<String>) -> DbResult<Vec<Contact>> {
    let conn = pool.get()?;
    let base = format!(
        "SELECT {SELECT_COLS} FROM contacts c LEFT JOIN projects p ON c.project_id = p.id"
    );

    let (sql, contacts) = match (project_id, search.as_deref()) {
        (Some(pid), Some(q)) => {
            let s = format!("{base} WHERE c.project_id = ?1 AND (c.name LIKE ?2 OR c.email LIKE ?2 OR c.company_name LIKE ?2) ORDER BY c.name");
            let like = format!("%{q}%");
            let mut stmt = conn.prepare(&s)?;
            let rows = stmt.query_map(params![pid, like], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
            (s, rows)
        }
        (Some(pid), None) => {
            let s = format!("{base} WHERE c.project_id = ?1 ORDER BY c.name");
            let mut stmt = conn.prepare(&s)?;
            let rows = stmt.query_map(params![pid], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
            (s, rows)
        }
        (None, Some(q)) => {
            let s = format!("{base} WHERE c.name LIKE ?1 OR c.email LIKE ?1 OR c.company_name LIKE ?1 ORDER BY c.name");
            let like = format!("%{q}%");
            let mut stmt = conn.prepare(&s)?;
            let rows = stmt.query_map(params![like], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
            (s, rows)
        }
        (None, None) => {
            let s = format!("{base} ORDER BY p.name, c.name");
            let mut stmt = conn.prepare(&s)?;
            let rows = stmt.query_map([], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
            (s, rows)
        }
    };
    let _ = sql;
    Ok(contacts)
}

pub fn create(pool: &DbPool, p: CreateContactPayload) -> DbResult<Contact> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO contacts (name, email, phone, company_name, company_address, project_id, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![p.name, p.email, p.phone, p.company_name, p.company_address, p.project_id, p.notes],
    )?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLS} FROM contacts c LEFT JOIN projects p ON c.project_id = p.id WHERE c.id = ?1"
    ))?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn update(pool: &DbPool, id: i64, p: UpdateContactPayload) -> DbResult<Contact> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE contacts SET
            name            = COALESCE(?1, name),
            email           = COALESCE(?2, email),
            phone           = COALESCE(?3, phone),
            company_name    = COALESCE(?4, company_name),
            company_address = COALESCE(?5, company_address),
            project_id      = COALESCE(?6, project_id),
            notes           = COALESCE(?7, notes),
            updated_at      = datetime('now')
         WHERE id = ?8",
        params![p.name, p.email, p.phone, p.company_name, p.company_address, p.project_id, p.notes, id],
    )?;
    let mut stmt = conn.prepare(&format!(
        "SELECT {SELECT_COLS} FROM contacts c LEFT JOIN projects p ON c.project_id = p.id WHERE c.id = ?1"
    ))?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM contacts WHERE id = ?1", params![id])?;
    Ok(())
}
