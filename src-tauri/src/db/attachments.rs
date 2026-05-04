use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmailAttachment {
    pub id: i64,
    pub email_id: i64,
    pub filename: String,
    pub file_path: String,
    pub mime_type: Option<String>,
    pub size: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct IncomingAttachment {
    pub filename: String,
    /// Either provided directly (n8n wrote the file) or derived after decoding `data`
    pub file_path: Option<String>,
    pub mime_type: Option<String>,
    pub size: Option<i64>,
    /// Base64-encoded file content sent by n8n when it cannot write files itself
    pub data: Option<String>,
}

/// Insert already-resolved attachments (file_path must be Some).
pub fn insert_resolved(pool: &DbPool, email_id: i64, filename: &str, file_path: &str, mime_type: Option<&str>, size: Option<i64>) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO email_attachments (email_id, filename, file_path, mime_type, size)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![email_id, filename, file_path, mime_type, size],
    )?;
    Ok(())
}

pub fn get_for_email(pool: &DbPool, email_id: i64) -> DbResult<Vec<EmailAttachment>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, email_id, filename, file_path, mime_type, size, created_at
         FROM email_attachments WHERE email_id = ?1 ORDER BY id",
    )?;
    let rows = stmt
        .query_map(params![email_id], |row| {
            Ok(EmailAttachment {
                id:         row.get(0)?,
                email_id:   row.get(1)?,
                filename:   row.get(2)?,
                file_path:  row.get(3)?,
                mime_type:  row.get(4)?,
                size:       row.get(5)?,
                created_at: row.get(6)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}
