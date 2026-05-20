use crate::db::{DbPool, DbResult};

const INIT_SQL: &str = include_str!("../../../sql/001_init.sql");
const MIGRATION_002: &str = include_str!("../../../sql/002_email_features.sql");
const MIGRATION_003: &str = include_str!("../../../sql/003_task_start_date.sql");
const MIGRATION_004: &str = include_str!("../../../sql/004_email_attachments.sql");
const MIGRATION_005: &str = include_str!("../../../sql/005_project_goals.sql");
const MIGRATION_006: &str = include_str!("../../../sql/006_task_goal_link.sql");
const MIGRATION_007: &str = include_str!("../../../sql/007_goal_global.sql");
const MIGRATION_008: &str = include_str!("../../../sql/008_gmail_tokens.sql");
const MIGRATION_009: &str = include_str!("../../../sql/009_indexes.sql");

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

    let applied_005: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations WHERE version = 5", [], |r| r.get(0))
        .unwrap_or(0);

    if applied_005 == 0 {
        conn.execute_batch(MIGRATION_005)?;
        conn.execute("INSERT OR IGNORE INTO _migrations (version) VALUES (5)", [])?;
    }

    let applied_006: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations WHERE version = 6", [], |r| r.get(0))
        .unwrap_or(0);

    if applied_006 == 0 {
        conn.execute_batch(MIGRATION_006)?;
        conn.execute("INSERT OR IGNORE INTO _migrations (version) VALUES (6)", [])?;
    }

    let applied_007: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations WHERE version = 7", [], |r| r.get(0))
        .unwrap_or(0);

    if applied_007 == 0 {
        conn.execute_batch(MIGRATION_007)?;
        conn.execute("INSERT OR IGNORE INTO _migrations (version) VALUES (7)", [])?;
    }

    let applied_008: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations WHERE version = 8", [], |r| r.get(0))
        .unwrap_or(0);

    if applied_008 == 0 {
        conn.execute_batch(MIGRATION_008)?;
        conn.execute("INSERT OR IGNORE INTO _migrations (version) VALUES (8)", [])?;
    }

    let applied_009: i64 = conn
        .query_row("SELECT COUNT(*) FROM _migrations WHERE version = 9", [], |r| r.get(0))
        .unwrap_or(0);

    if applied_009 == 0 {
        conn.execute_batch(MIGRATION_009)?;
        conn.execute("INSERT OR IGNORE INTO _migrations (version) VALUES (9)", [])?;
    }

    Ok(())
}
