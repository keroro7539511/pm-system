use tauri::State;

use crate::db::{employees, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub fn get_employees(
    pool: State<DbPool>,
    search: Option<String>,
) -> CmdResult<Vec<employees::Employee>> {
    employees::get_all(&pool, search).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_employee(
    pool: State<DbPool>,
    payload: employees::CreateEmployeePayload,
) -> CmdResult<employees::Employee> {
    employees::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_employee(
    pool: State<DbPool>,
    id: i64,
    payload: employees::UpdateEmployeePayload,
) -> CmdResult<employees::Employee> {
    employees::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn upsert_employee(
    pool: State<DbPool>,
    payload: employees::CreateEmployeePayload,
) -> CmdResult<employees::Employee> {
    employees::upsert(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_employee(pool: State<DbPool>, id: i64) -> CmdResult<()> {
    employees::delete(&pool, id).map_err(|e| e.to_string())
}
