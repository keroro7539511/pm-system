use crate::db::{DbPool, DbResult};

const INIT_SQL: &str = include_str!("../../../sql/001_init.sql");
const MIGRATION_002: &str = include_str!("../../../sql/002_email_features.sql");
const MIGRATION_003: &str = include_str!("../../../sql/003_task_start_date.sql");
const MIGRATION_004: &str = include_str!("../../../sql/004_email_attachments.sql");

pub fn run(pool: &DbPool) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute_batch(INIT_SQL)?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY);",
    )?;

    let applied: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM _migrations WHERE version = 2",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if applied == 0 {
        conn.execute_batch(MIGRATION_002)?;
        conn.execute(
            "INSERT OR IGNORE INTO _migrations (version) VALUES (2)",
            [],
        )?;
    }

    let applied_003: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM _migrations WHERE version = 3",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if applied_003 == 0 {
        conn.execute_batch(MIGRATION_003)?;
        conn.execute(
            "INSERT OR IGNORE INTO _migrations (version) VALUES (3)",
            [],
        )?;
    }

    let applied_004: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations WHERE version = 4", [], |r| r.get(0))
        .unwrap_or(0);

    if applied_004 == 0 {
        conn.execute_batch(MIGRATION_004)?;
        conn.execute("INSERT OR IGNORE INTO _migrations (version) VALUES (4)", [])?;
    }

    Ok(())
}
