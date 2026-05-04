use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: i64,
    pub name: String,
    pub doc_type: Option<String>,
    pub version: Option<String>,
    pub file_path: Option<String>,
    pub content_md: Option<String>,
    pub client_id: Option<i64>,
    pub project_id: Option<i64>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentPayload {
    pub name: String,
    pub doc_type: Option<String>,
    pub version: Option<String>,
    pub content_md: Option<String>,
    pub client_id: Option<i64>,
    pub project_id: Option<i64>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentPayload {
    pub name: Option<String>,
    pub doc_type: Option<String>,
    pub version: Option<String>,
    pub content_md: Option<String>,
    pub client_id: Option<i64>,
    pub project_id: Option<i64>,
    pub expires_at: Option<String>,
}

fn map_row(row: &Row) -> rusqlite::Result<Document> {
    Ok(Document {
        id: row.get(0)?,
        name: row.get(1)?,
        doc_type: row.get(2)?,
        version: row.get(3)?,
        file_path: row.get(4)?,
        content_md: row.get(5)?,
        client_id: row.get(6)?,
        project_id: row.get(7)?,
        expires_at: row.get(8)?,
        created_at: row.get(9)?,
    })
}

const COLS: &str =
    "id, name, type, version, file_path, content_md, client_id, project_id, expires_at, created_at";

pub fn get_all(pool: &DbPool, search: Option<String>) -> DbResult<Vec<Document>> {
    let conn = pool.get()?;
    let sql = if search.is_some() {
        format!("SELECT {COLS} FROM documents WHERE name LIKE ?1 OR content_md LIKE ?1 ORDER BY type, name")
    } else {
        format!("SELECT {COLS} FROM documents ORDER BY type, name")
    };
    let mut stmt = conn.prepare(&sql)?;
    let docs = if let Some(q) = search {
        let pattern = format!("%{q}%");
        stmt.query_map(params![pattern], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?
    } else {
        stmt.query_map([], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?
    };
    Ok(docs)
}

pub fn get_by_id(pool: &DbPool, id: i64) -> DbResult<Document> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(&format!("SELECT {COLS} FROM documents WHERE id = ?1"))?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn create(pool: &DbPool, p: CreateDocumentPayload) -> DbResult<Document> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO documents (name, type, version, content_md, client_id, project_id, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![p.name, p.doc_type, p.version, p.content_md, p.client_id, p.project_id, p.expires_at],
    )?;
    get_by_id(pool, conn.last_insert_rowid())
}

pub fn update(pool: &DbPool, id: i64, p: UpdateDocumentPayload) -> DbResult<Document> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE documents SET
            name       = COALESCE(?1, name),
            type       = ?2,
            version    = ?3,
            content_md = ?4,
            client_id  = ?5,
            project_id = ?6,
            expires_at = ?7
         WHERE id = ?8",
        params![p.name, p.doc_type, p.version, p.content_md, p.client_id, p.project_id, p.expires_at, id],
    )?;
    get_by_id(pool, id)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM documents WHERE id = ?1", params![id])?;
    Ok(())
}
