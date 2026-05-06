use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::db::{DbPool, DbResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectGoal {
    pub id: i64,
    pub project_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub is_done: bool,
    pub sort_order: i32,
    pub created_at: String,
}

/// Goal enriched with project name and linked-task statistics
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoalWithStats {
    pub id: i64,
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub is_done: bool,
    pub sort_order: i32,
    pub task_count: i64,
    pub done_count: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateGoalPayload {
    pub project_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGoalPayload {
    pub title: Option<String>,
    pub description: Option<String>,
    pub is_done: Option<bool>,
}

fn map_goal(row: &rusqlite::Row) -> rusqlite::Result<ProjectGoal> {
    Ok(ProjectGoal {
        id:          row.get(0)?,
        project_id:  row.get(1)?,
        title:       row.get(2)?,
        description: row.get(3)?,
        is_done:     row.get::<_, i64>(4)? != 0,
        sort_order:  row.get(5)?,
        created_at:  row.get(6)?,
    })
}

fn map_stats(row: &rusqlite::Row) -> rusqlite::Result<GoalWithStats> {
    Ok(GoalWithStats {
        id:           row.get(0)?,
        project_id:   row.get(1)?,
        project_name: row.get(2)?,
        title:        row.get(3)?,
        description:  row.get(4)?,
        is_done:      row.get::<_, i64>(5)? != 0,
        sort_order:   row.get(6)?,
        created_at:   row.get(7)?,
        task_count:   row.get(8)?,
        done_count:   row.get(9)?,
    })
}

const STATS_SQL: &str =
    "SELECT g.id, g.project_id, p.name, g.title, g.description,
            g.is_done, g.sort_order, g.created_at,
            COUNT(t.id) as task_count,
            COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done_count
     FROM project_goals g
     LEFT JOIN projects p ON g.project_id = p.id
     LEFT JOIN tasks t ON t.goal_id = g.id";

pub fn get_all(pool: &DbPool, project_id: Option<i64>) -> DbResult<Vec<GoalWithStats>> {
    let conn = pool.get()?;
    // When filtering by project: show that project's goals + global goals (project_id IS NULL)
    let sql = if project_id.is_some() {
        format!("{STATS_SQL} WHERE (g.project_id = ?1 OR g.project_id IS NULL) GROUP BY g.id ORDER BY g.project_id NULLS LAST, g.sort_order, g.id")
    } else {
        format!("{STATS_SQL} GROUP BY g.id ORDER BY g.project_id NULLS LAST, g.sort_order, g.id")
    };
    let mut stmt = conn.prepare(&sql)?;
    let rows = if let Some(pid) = project_id {
        stmt.query_map(params![pid], map_stats)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    } else {
        stmt.query_map([], map_stats)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };
    Ok(rows)
}

/// Returns goals for a specific project + global goals (project_id IS NULL)
pub fn get_for_project(pool: &DbPool, project_id: i64) -> DbResult<Vec<ProjectGoal>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, is_done, sort_order, created_at
         FROM project_goals
         WHERE project_id = ?1 OR project_id IS NULL
         ORDER BY project_id NULLS LAST, sort_order, id",
    )?;
    let rows = stmt
        .query_map(params![project_id], map_goal)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn create(pool: &DbPool, p: CreateGoalPayload) -> DbResult<ProjectGoal> {
    let conn = pool.get()?;
    let max_order: i32 = if let Some(pid) = p.project_id {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM project_goals WHERE project_id = ?1",
            params![pid],
            |r| r.get(0),
        ).unwrap_or(-1)
    } else {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM project_goals WHERE project_id IS NULL",
            [],
            |r| r.get(0),
        ).unwrap_or(-1)
    };
    conn.execute(
        "INSERT INTO project_goals (project_id, title, description, sort_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![p.project_id, p.title, p.description, max_order + 1],
    )?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, is_done, sort_order, created_at
         FROM project_goals WHERE id = ?1",
    )?;
    Ok(stmt.query_row(params![id], map_goal)?)
}

pub fn update(pool: &DbPool, id: i64, p: UpdateGoalPayload) -> DbResult<ProjectGoal> {
    let conn = pool.get()?;
    conn.execute(
        "UPDATE project_goals SET
           title       = COALESCE(?1, title),
           description = COALESCE(?2, description),
           is_done     = COALESCE(?3, is_done)
         WHERE id = ?4",
        params![p.title, p.description, p.is_done.map(|b| b as i64), id],
    )?;
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, is_done, sort_order, created_at
         FROM project_goals WHERE id = ?1",
    )?;
    Ok(stmt.query_row(params![id], map_goal)?)
}

pub fn delete(pool: &DbPool, id: i64) -> DbResult<()> {
    let conn = pool.get()?;
    // Unlink tasks before deleting
    conn.execute("UPDATE tasks SET goal_id = NULL WHERE goal_id = ?1", params![id])?;
    conn.execute("DELETE FROM project_goals WHERE id = ?1", params![id])?;
    Ok(())
}
