use tauri::State;

use crate::db::{
    goals::{CreateGoalPayload, GoalWithStats, ProjectGoal, UpdateGoalPayload},
    DbPool,
};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_all_goals(pool: State<'_, DbPool>, project_id: Option<i64>) -> CmdResult<Vec<GoalWithStats>> {
    crate::db::goals::get_all(&pool, project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project_goals(pool: State<'_, DbPool>, project_id: i64) -> CmdResult<Vec<ProjectGoal>> {
    crate::db::goals::get_for_project(&pool, project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_project_goal(pool: State<'_, DbPool>, payload: CreateGoalPayload) -> CmdResult<ProjectGoal> {
    crate::db::goals::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_project_goal(pool: State<'_, DbPool>, id: i64, payload: UpdateGoalPayload) -> CmdResult<ProjectGoal> {
    crate::db::goals::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_project_goal(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    crate::db::goals::delete(&pool, id).map_err(|e| e.to_string())
}
