use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use tauri::Manager;

pub mod attachments;
pub mod clients;
pub mod contacts;
pub mod documents;
pub mod emails;
pub mod employees;
pub mod goals;
pub mod migrations;
pub mod projects;
pub mod tasks;

pub type DbPool = Pool<SqliteConnectionManager>;

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("SQLite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Pool: {0}")]
    Pool(#[from] r2d2::Error),
    #[error("IO: {0}")]
    Io(#[from] std::io::Error),
}

pub type DbResult<T> = Result<T, DbError>;

pub fn init(app_handle: &tauri::AppHandle) -> Result<DbPool, DbError> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| DbError::Io(std::io::Error::other(e.to_string())))?;

    std::fs::create_dir_all(&app_data_dir)?;

    let db_path = app_data_dir.join("data.db");
    let manager = SqliteConnectionManager::file(&db_path);
    let pool = Pool::new(manager)?;

    {
        let conn = pool.get()?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    }

    migrations::run(&pool)?;

    Ok(pool)
}
