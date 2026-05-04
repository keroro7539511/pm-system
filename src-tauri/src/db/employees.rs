use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Employee {
    pub id: i64,
    pub name: String,
    pub email: Option<String>,
    pub extension: Option<String>,
    pub department: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEmployeePayload {
    pub name: String,
    pub email: Option<String>,
    pub extension: Option<String>,
    pub department: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEmployeePayload {
    pub name: Option<String>,
    pub email: Option<String>,
    pub extension: Option<String>,
    pub department: Option<String>,
}

fn map_row(row: &Row) -> rusqlite::Result<Employee> {
    Ok(Employee {
        id:         row.get(0)?,
        name:       row.get(1)?,
        email:      row.get(2)?,
        extension:  row.get(3)?,
        department: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub fn get_all(pool: &DbPool, search: Option<String>) -> DbResult<Vec<Employee>> {
    let conn = pool.get()?;
    let (sql, employees) = match search.as_deref() {
        Some(q) => {
            let s = "SELECT id, name, email, extension, department, created_at FROM employees \
                     WHERE name LIKE ?1 OR department LIKE ?1 ORDER BY department, name";
            let like = format!("%{q}%");
            let mut stmt = conn.prepare(s)?;
            let rows = stmt.query_map(params![like], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
            (s.to_string(), rows)
        }
        None => {
            let s = "SELECT id, name, email, extension, department, created_at FROM employees \
                     ORDER BY department, name";
            let mut stmt = conn.prepare(s)?;
            let rows = stmt.query_map([], map_row)?.collect::<rusqlite::Result<Vec<_>>>()?;
            (s.to_string(), rows)
        }
    };
    let _ = sql;
    Ok(employees)
}

pub fn create(pool: &DbPool, p: CreateEmployeePayload) -> DbResult<Employee> {
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO employees (name, email, extension, department) VALUES (?1, ?2, ?3, ?4)",
        params![p.name, p.email, p.extension, p.department],
    )?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn.prepare(
        "SELECT id, name, email, extension, department, created_at FROM employees WHERE id = ?1",
    )?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn update(pool: &DbPool, id: i64, p: UpdateEmployeePayload) -> DbResult<Employee> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE employees SET
            name       = COALESCE(?1, name),
            email      = COALESCE(?2, email),
            extension  = COALESCE(?3, extension),
            department = COALESCE(?4, department)
         WHERE id = ?5",
        params![p.name, p.email, p.extension, p.department, id],
    )?;
    let mut stmt = conn.prepare(
        "SELECT id, name, email, extension, department, created_at FROM employees WHERE id = ?1",
    )?;
    Ok(stmt.query_row(params![id], map_row)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    conn.execute("DELETE FROM employees WHERE id = ?1", params![id])?;
    Ok(())
}
