use tauri::State;

use crate::db::{documents, DbPool};

type CmdResult<T> = Result<T, String>;

#[tauri::command]
pub async fn get_documents(
    pool: State<'_, DbPool>,
    search: Option<String>,
) -> CmdResult<Vec<documents::Document>> {
    documents::get_all(&pool, search).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_document(
    pool: State<'_, DbPool>,
    payload: documents::CreateDocumentPayload,
) -> CmdResult<documents::Document> {
    documents::create(&pool, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_document(
    pool: State<'_, DbPool>,
    id: i64,
    payload: documents::UpdateDocumentPayload,
) -> CmdResult<documents::Document> {
    documents::update(&pool, id, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_document(pool: State<'_, DbPool>, id: i64) -> CmdResult<()> {
    documents::delete(&pool, id).map_err(|e| e.to_string())
}
