use crate::db::{DbPool, DbResult};

const INIT_SQL: &str = include_str!("../../../sql/001_init.sql");

pub fn run(pool: &DbPool) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute_batch(INIT_SQL)?;
    Ok(())
}
