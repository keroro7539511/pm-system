use crate::db::{DbPool, DbResult};

pub struct GmailToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: i64,
    pub email: Option<String>,
}

pub fn get(pool: &DbPool) -> DbResult<Option<GmailToken>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT access_token, refresh_token, expires_at, email FROM gmail_tokens WHERE id = 1",
    )?;
    let mut rows = stmt.query_map([], |row| {
        Ok(GmailToken {
            access_token: row.get(0)?,
            refresh_token: row.get(1)?,
            expires_at: row.get(2)?,
            email: row.get(3)?,
        })
    })?;
    Ok(rows.next().transpose()?)
}

pub fn save(pool: &DbPool, token: &GmailToken) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO gmail_tokens (id, access_token, refresh_token, expires_at, email, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           access_token  = excluded.access_token,
           refresh_token = COALESCE(excluded.refresh_token, gmail_tokens.refresh_token),
           expires_at    = excluded.expires_at,
           email         = COALESCE(excluded.email, gmail_tokens.email),
           updated_at    = excluded.updated_at",
        rusqlite::params![
            token.access_token,
            token.refresh_token,
            token.expires_at,
            token.email,
        ],
    )?;
    Ok(())
}

pub fn delete(pool: &DbPool) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM gmail_tokens WHERE id = 1", [])?;
    Ok(())
}
